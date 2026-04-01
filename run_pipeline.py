"""Run the NICs exemption pipeline — replicates Nikhil's notebook exactly,
then produces the dashboard JSON with real PolicyEngine numbers."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from microdf import MicroDataFrame, MicroSeries

# ── Step 1: Load PolicyEngine baseline ──────────────────────────────────

print("Step 1: Loading PolicyEngine UK baseline...")
from policyengine_uk import Microsimulation

baseline = Microsimulation()
YEAR = 2025

# ── Step 2: Load and prepare LFS data ──────────────────────────────────

print("Step 2: Loading LFS data...")
LFS_PATH = Path.home() / "Downloads/UKDA-9133-tab/tab/lgwt22_5q_aj22_aj23_eul.tab"
lfs = pd.read_csv(LFS_PATH, sep="\t")

inactivity_variables = [
    "INCAC051", "INCAC052", "INCAC053", "INCAC054", "INCAC055",
]

was_inactive_at_some_point = np.any(
    [lfs[col] >= 6 for col in inactivity_variables], axis=0
)
became_active = np.any(
    [lfs[col] == 1 for col in inactivity_variables], axis=0
)
quarter_of_last_inactivity = np.argmax(
    [lfs[col] >= 6 for col in inactivity_variables],
)
quarter_of_first_activity = quarter_of_last_inactivity
length_activity_after_inactivity = (
    (4 - quarter_of_first_activity + 1) / 4
)

y_train = pd.DataFrame(dict(
    was_inactive_at_some_point=was_inactive_at_some_point,
    became_active_afterwards=became_active,
    activity_length_after_inactivity=(
        length_activity_after_inactivity
        * was_inactive_at_some_point
        * became_active
    ),
))

predictor_mapping = {
    'AGE5': 'age', 'SEX': 'sex', 'MARSTA5': 'marital_status',
    'ETUKEUL5': 'ethnicity', 'HIQUAL155': 'highest_qualification',
    'GOVTOR5': 'region', 'FTPTWK5': 'full_or_part_time',
    'SOC20M5': 'occupation_code', 'Inds07m5': 'industry_code',
    'PUBLICR5': 'public_or_private_sector', 'GRSSWK5': 'gross_weekly_pay',
    'HRRATE5': 'hourly_pay_rate', 'TEN15': 'housing_tenure',
    'HDPCH195': 'num_dependent_children',
    'QULNOW5': 'current_qualification_studying',
    'ENROLL5': 'enrolled_in_education',
    'LNGLST5': 'has_longstanding_illness',
    'LIMACT5': 'illness_limits_activities',
    'DISEA5': 'disability_equality_act',
    'LNGLST1': 'had_longstanding_illness_q1',
    'LIMACT1': 'illness_limited_activities_q1',
    'DISEA1': 'disability_equality_act_q1',
}

X_train = lfs[list(predictor_mapping.keys())].rename(columns=predictor_mapping)
weights = lfs['LGWT22'].copy()

categorical_vars = [
    'sex', 'marital_status', 'ethnicity', 'highest_qualification', 'region',
    'full_or_part_time', 'public_or_private_sector', 'housing_tenure',
    'enrolled_in_education', 'current_qualification_studying',
    'has_longstanding_illness', 'illness_limits_activities',
    'disability_equality_act', 'had_longstanding_illness_q1',
    'illness_limited_activities_q1', 'disability_equality_act_q1',
    'occupation_code', 'industry_code',
]

for col in categorical_vars:
    if col in X_train.columns:
        X_train[col] = (
            X_train[col].astype('Int64').astype(str).replace('<NA>', 'missing')
        )

mask = weights.notna() & y_train['activity_length_after_inactivity'].notna()
X_train = X_train[mask]
y_train = y_train[mask]
weights = weights[mask]

print(f"  LFS shapes - X: {X_train.shape}, y: {y_train.shape}")
print(f"  Positive class rate: {y_train['activity_length_after_inactivity'].mean():.3f}")

# ── Step 2b: Compute baseline stats from PolicyEngine & LFS ─────────────

print("Step 2b: Computing baseline statistics from PolicyEngine & LFS...")

age = baseline.calculate("age", YEAR).values
person_weights = baseline.calculate("person_weight", YEAR)
employment_status = baseline.calculate("employment_status", YEAR).values
is_disabled_benefits = baseline.calculate("is_disabled_for_benefits", YEAR).values

working_age = (age >= 16) & (age <= 64)

# Economically inactive: working-age people in non-active employment statuses
inactive_statuses = [
    "LONG_TERM_DISABLED", "SHORT_TERM_DISABLED", "CARER", "STUDENT", "RETIRED",
]
is_inactive = np.isin(employment_status, inactive_statuses) & working_age

# Broad disability definition: union of benefit receipt + disability-related
# employment statuses + ESA receipt + attendance allowance receipt.
# This is broader than is_disabled_for_benefits (DLA/PIP only) but still
# narrower than the Equality Act self-reported definition (~10.4M).
pip_vals = baseline.calculate("pip", YEAR).values.astype(float)
dla_vals = baseline.calculate("dla", YEAR).values.astype(float)
esa_contrib_vals = baseline.calculate("esa_contrib", YEAR).values.astype(float)
aa_vals = baseline.calculate("attendance_allowance", YEAR).values.astype(float)

is_disabled_broad = (
    is_disabled_benefits
    | (esa_contrib_vals > 0)
    | (aa_vals > 0)
    | np.isin(employment_status, ["LONG_TERM_DISABLED", "SHORT_TERM_DISABLED"])
)

n_economically_inactive = float(
    MicroSeries(is_inactive.astype(float), weights=person_weights).sum()
)
n_disabled = float(
    MicroSeries((is_disabled_broad & working_age).astype(float), weights=person_weights).sum()
)
n_inactive_disabled = float(
    MicroSeries((is_inactive & is_disabled_broad).astype(float), weights=person_weights).sum()
)

print(f"  Disability definition breakdown:")
print(f"    DLA/PIP only: {float(MicroSeries((is_disabled_benefits & working_age).astype(float), weights=person_weights).sum()):,.0f}")
print(f"    + ESA contrib: {float(MicroSeries(((is_disabled_benefits | (esa_contrib_vals > 0)) & working_age).astype(float), weights=person_weights).sum()):,.0f}")
print(f"    + AA: {float(MicroSeries(((is_disabled_benefits | (esa_contrib_vals > 0) | (aa_vals > 0)) & working_age).astype(float), weights=person_weights).sum()):,.0f}")
print(f"    + Employment status disabled: {float(MicroSeries((is_disabled_broad & working_age).astype(float), weights=person_weights).sum()):,.0f}")

# Disability-related benefits: PIP + DLA + AA + ESA (income + contrib) + Carer's Allowance
benunit_weights = baseline.calculate("benunit_weight", YEAR)

pip_total = MicroSeries(pip_vals, weights=person_weights).sum()
dla_total = MicroSeries(dla_vals, weights=person_weights).sum()
aa_total = MicroSeries(aa_vals, weights=person_weights).sum()
ca_total = MicroSeries(
    baseline.calculate("carers_allowance", YEAR).values.astype(float),
    weights=person_weights,
).sum()
esa_contrib_total = MicroSeries(esa_contrib_vals, weights=person_weights).sum()
esa_income_total = MicroSeries(
    baseline.calculate("esa_income", YEAR).values.astype(float),
    weights=benunit_weights,
).sum()

total_disability_benefits_bn = (
    pip_total + dla_total + aa_total + ca_total + esa_contrib_total + esa_income_total
) / 1e9

# Employment rates and disability employment gap
employed_statuses = ["FT_EMPLOYED", "PT_EMPLOYED", "FT_SELF_EMPLOYED", "PT_SELF_EMPLOYED"]
is_employed = np.isin(employment_status, employed_statuses) & working_age

dis_employed = is_disabled_broad & is_employed
n_dis_employed = float(MicroSeries(dis_employed.astype(float), weights=person_weights).sum())
dis_emp_rate = round(n_dis_employed / max(n_disabled, 1) * 100, 1)

non_dis = ~is_disabled_broad & working_age
non_dis_employed = non_dis & is_employed
n_non_dis = float(MicroSeries(non_dis.astype(float), weights=person_weights).sum())
n_non_dis_employed = float(MicroSeries(non_dis_employed.astype(float), weights=person_weights).sum())
non_dis_emp_rate = round(n_non_dis_employed / max(n_non_dis, 1) * 100, 1)
disability_emp_gap = round(non_dis_emp_rate - dis_emp_rate, 1)

pct_inactive_disabled = round(n_inactive_disabled / max(n_economically_inactive, 1) * 100, 1)

# Average employer NICs per employed worker
ni_employer_vals = baseline.calculate("ni_employer", YEAR).values.astype(float)
avg_nics_per_worker = round(float(
    MicroSeries(ni_employer_vals * is_employed, weights=person_weights).sum()
) / max(float(MicroSeries(is_employed.astype(float), weights=person_weights).sum()), 1))

print(f"  Economically inactive (working age): {n_economically_inactive:,.0f}")
print(f"  Disabled (working age): {n_disabled:,.0f}")
print(f"  Inactive & disabled: {n_inactive_disabled:,.0f}")
print(f"  Total disability benefits: £{total_disability_benefits_bn:.1f}bn")
print(f"  Disabled employment rate: {dis_emp_rate}%")
print(f"  Non-disabled employment rate: {non_dis_emp_rate}%")
print(f"  Disability employment gap: {disability_emp_gap}pp")
print(f"  % of inactive who are disabled: {pct_inactive_disabled}%")
print(f"  Avg employer NICs per worker: £{avg_nics_per_worker:,}")

# Inactivity reasons from LFS (most recent quarter, working-age)
lfs_age = lfs["AGE5"]
lfs_working_age = (lfs_age >= 16) & (lfs_age <= 64)
lfs_inactive_col = "INCAC055"
lfs_inactive_mask = (lfs[lfs_inactive_col] >= 6) & lfs_working_age

_reason_map = {
    6: "Long-term sick or disabled",
    7: "Looking after family/home",
    10: "Other",
    13: "Student",
    14: "Looking after family/home",
    15: "Temporarily sick or disabled",
    16: "Long-term sick or disabled",
    17: "Other",
    18: "Retired early",
    19: "Other",
    20: "Retired early",
    21: "Other",
    24: "Student",
    25: "Looking after family/home",
    26: "Temporarily sick or disabled",
    27: "Long-term sick or disabled",
    28: "Other",
    29: "Other",
    30: "Retired early",
    31: "Other",
    32: "Other",
    33: "Other",
}

_inactive_lfs = lfs.loc[lfs_inactive_mask, [lfs_inactive_col, "LGWT22"]].copy()
_inactive_lfs["reason"] = _inactive_lfs[lfs_inactive_col].map(_reason_map).fillna("Other")
inactivity_reasons_series = (
    _inactive_lfs.groupby("reason")["LGWT22"].sum().sort_values(ascending=False)
)
inactivity_reasons = [
    {"reason": reason, "count": round(float(count))}
    for reason, count in inactivity_reasons_series.items()
]

for item in inactivity_reasons:
    print(f"  {item['reason']}: {item['count']:,}")

# ── Step 3: Prepare donor data and run autoimpute ──────────────────────

print("Step 3: Preparing imputation...")
df = pd.concat([X_train, y_train], axis=1)
df["employment_income"] = df.gross_weekly_pay.clip(lower=0) * 52
df["gender"] = df.sex.astype(int).map({1: "MALE", 2: "FEMALE"})
df["weight"] = weights

efrs = baseline.calculate_dataframe(
    ["age", "gender", "employment_income"], YEAR
)

imputed_vars = ["was_inactive_at_some_point", "became_active_afterwards"]
predictor_vars = ["age", "gender", "employment_income"]

print("Step 4: Running imputation...")

# Cast booleans to float to avoid numpy boolean subtract error in cross-validation
for col in imputed_vars:
    df[col] = df[col].astype(float)

from microimpute.comparisons import autoimpute
from microimpute import QuantReg, OLS, QRF

# Try all three models — autoimpute picks the best via cross-validation
print("  Running autoimpute with OLS, QuantReg, QRF...")
results = autoimpute(
    df, efrs,
    predictors=predictor_vars,
    imputed_variables=imputed_vars,
    weight_col="weight",
    models=[OLS, QuantReg, QRF],
)
print(f"  CV results:\n{results.cv_results}")

# ── Step 5: Process imputed results (exactly as notebook) ──────────────

print("Step 5: Processing imputed results...")
# autoimpute returns AutoImputeResult with .receiver_data containing imputations
efrs_imp = results.receiver_data.copy()
print(f"  Columns: {list(efrs_imp.columns)}")
print(f"  was_inactive mean: {efrs_imp.was_inactive_at_some_point.mean():.4f}")
print(f"  became_active mean: {efrs_imp.became_active_afterwards.mean():.4f}")

efrs_imp["joined_labour_force_recently"] = (
    efrs_imp.was_inactive_at_some_point * efrs_imp.became_active_afterwards
)
efrs_imp["joined_labour_force_recently"] = np.where(
    efrs_imp.age < 16, 0, efrs_imp["joined_labour_force_recently"]
)

for col in efrs_imp.columns:
    if col != "gender":
        efrs_imp[col] = efrs_imp[col].astype(np.float32)

# ── Step 6: Calculate employer NICs (the key result) ───────────────────

print("Step 6: Computing employer NICs...")
ni_employer = baseline.calculate("ni_employer", YEAR)
person_weights = baseline.calculate("person_weight", YEAR)

efrs_imp["ni_employer"] = ni_employer.values

# Map household/benunit variables to person level via entity projection
_person_pop = baseline.populations["person"]
efrs_imp["country"] = _person_pop.household("country", YEAR)
efrs_imp["family_type"] = _person_pop.benunit("family_type", YEAR)

efrs_mdf = MicroDataFrame(efrs_imp, weights=person_weights)

nics_by_status = (
    efrs_mdf.ni_employer
    .groupby(efrs_mdf.joined_labour_force_recently > 0.5)
    .sum() / 1e9
)

print("\n" + "=" * 60)
print("KEY RESULTS — Employer NICs by recently-active status:")
print("=" * 60)
print(nics_by_status)
print(f"\nTotal employer NICs: £{efrs_mdf.ni_employer.sum()/1e9:.1f}bn")
print(f"NICs on recently-active:     £{nics_by_status.get(True, 0):.2f}bn")
print(f"NICs on not recently-active: £{nics_by_status.get(False, 0):.2f}bn")
print(f"Cost of exemption (static):  £{nics_by_status.get(True, 0):.2f}bn")

# Average NICs per recently-active worker (working age only)
_wa_recent = (efrs_imp.joined_labour_force_recently > 0.5) & (efrs_imp.age >= 16) & (efrs_imp.age < 65)
_n_wa_recent = float(MicroSeries(_wa_recent.astype(float), weights=person_weights).sum())
_nics_wa_recent = float(MicroSeries(efrs_imp.ni_employer.values * _wa_recent, weights=person_weights).sum())
avg_nics_per_recent = round(_nics_wa_recent / max(_n_wa_recent, 1))
print(f"Avg employer NICs per recently-active worker: £{avg_nics_per_recent:,}")

# ── Step 7: Build age-group breakdowns ─────────────────────────────────

print("\nStep 7: Building age-group breakdowns...")
age_bins = [(16, 24, "16-24"), (25, 34, "25-34"), (35, 49, "35-49"),
            (50, 64, "50-64"), (65, 100, "65+")]

age_data = []
for lo, hi, label in age_bins:
    m = (efrs_imp.age >= lo) & (efrs_imp.age <= hi)
    m_recent = m & (efrs_imp.joined_labour_force_recently > 0.5)

    n_total = float(MicroSeries(m.astype(float), weights=person_weights).sum())
    n_recent = float(MicroSeries(m_recent.astype(float), weights=person_weights).sum())
    nics_recent = float(
        MicroSeries(efrs_imp.ni_employer.values * m_recent, weights=person_weights).sum() / 1e9
    )
    nics_total = float(
        MicroSeries(efrs_imp.ni_employer.values * m, weights=person_weights).sum() / 1e9
    )

    pct_recent = round(n_recent / max(n_total, 1) * 100, 1)

    print(f"  {label}: {n_recent:,.0f} recently active, "
          f"£{nics_recent:.2f}bn NICs exemption cost, "
          f"{pct_recent}% rate")

    age_data.append({
        "age_group": label,
        "n_total": round(n_total),
        "n_recently_active": round(n_recent),
        "pct_recently_active": pct_recent,
        "nics_exemption_cost_bn": round(nics_recent, 2),
        "employer_nics_bn": round(nics_total, 1),
    })

# ── Step 7b: Build breakdowns by gender, country, family type ─────────

print("\nStep 7b: Building breakdowns by gender, country, family type...")

is_recent = efrs_imp.joined_labour_force_recently > 0.5
is_working_age = (efrs_imp.age >= 16) & (efrs_imp.age < 65)

def _build_breakdown(group_col, group_vals):
    rows = []
    for val in group_vals:
        m = (efrs_imp[group_col] == val) & is_working_age
        m_recent = m & is_recent
        n_recent = float(MicroSeries(m_recent.astype(float), weights=person_weights).sum())
        nics_cost = float(
            MicroSeries(efrs_imp.ni_employer.values * m_recent, weights=person_weights).sum() / 1e9
        )
        rows.append({
            "group": str(val).replace("_", " ").title(),
            "n_recently_active": round(n_recent),
            "nics_exemption_cost_bn": round(nics_cost, 2),
        })
    return rows

by_gender = _build_breakdown("gender", ["MALE", "FEMALE"])
by_country = _build_breakdown("country", ["ENGLAND", "SCOTLAND", "WALES", "NORTHERN_IRELAND"])
by_family = _build_breakdown("family_type", [
    "SINGLE", "COUPLE_NO_CHILDREN", "COUPLE_WITH_CHILDREN", "LONE_PARENT",
])

for label, data_list in [("Gender", by_gender), ("Country", by_country), ("Family type", by_family)]:
    print(f"  {label}:")
    for r in data_list:
        print(f"    {r['group']}: {r['n_recently_active']:,} active, £{r['nics_exemption_cost_bn']}bn")

# ── Step 8: Build by-age chart data (% becoming active, like notebook) ─

print("\nStep 8: Building activity-by-age chart data...")

# Chart 1 from notebook: LFS raw data — % becoming active by age
from microdf import MicroDataFrame as _MDF
lfs_df_chart = pd.DataFrame({
    "age": X_train.age.astype(float),
    "became_active": (y_train.was_inactive_at_some_point * y_train.became_active_afterwards).astype(float),
})
lfs_df_chart["weight"] = weights.values
lfs_mdf = _MDF(lfs_df_chart, weights=lfs_df_chart.weight)
pct_active_by_age_lfs = lfs_mdf.became_active.groupby(lfs_mdf.age).mean()

# Chart 2 from notebook: Imputed onto Enhanced FRS
pct_active_by_age = (
    efrs_mdf.joined_labour_force_recently
    .groupby(efrs_mdf.age)
    .mean()
)

# ── Step 9: Write results JSON ─────────────────────────────────────────

print("\nStep 9: Writing results JSON...")

total_nics = float(efrs_mdf.ni_employer.sum() / 1e9)
nics_recently_active = float(nics_by_status.get(True, 0))
nics_not_recently_active = float(nics_by_status.get(False, 0))

output = {
    "year": YEAR,
    "baseline": {
        "summary": {
            "n_economically_inactive": round(n_economically_inactive),
            "n_disabled": round(n_disabled),
            "n_inactive_disabled": round(n_inactive_disabled),
            "total_employer_nics_bn": round(total_nics, 1),
            "total_disability_benefits_bn": round(total_disability_benefits_bn, 1),
            "disabled_employment_rate": dis_emp_rate,
            "non_disabled_employment_rate": non_dis_emp_rate,
            "disability_employment_gap_pp": disability_emp_gap,
            "pct_inactive_disabled": pct_inactive_disabled,
            "avg_nics_per_worker": avg_nics_per_worker,
        },
        "by_age": age_data,
        "inactivity_reasons": inactivity_reasons,
        "by_region": [],
    },
    "nics_exemption": {
        "total_employer_nics_bn": round(total_nics, 1),
        "nics_recently_active_bn": round(nics_recently_active, 2),
        "nics_not_recently_active_bn": round(nics_not_recently_active, 2),
    },
    "reform": {
        "nics_exemption": {
            "summary": {
                "cost_bn": round(nics_recently_active, 1),
                "avg_nics_per_recent_worker": avg_nics_per_recent,
            },
            "by_age": [
                {
                    "age_group": d["age_group"],
                    "n_recently_active": d["n_recently_active"],
                    "nics_exemption_cost_bn": d["nics_exemption_cost_bn"],
                }
                for d in age_data
            ],
            "by_gender": by_gender,
            "by_country": by_country,
            "by_family_type": by_family,
        },
    },
    "pct_active_by_age_lfs": {
        str(int(k)): round(float(v), 4)
        for k, v in pct_active_by_age_lfs.items()
        if not np.isnan(v)
    },
    "pct_active_by_age": {
        str(int(k)): round(float(v), 4)
        for k, v in pct_active_by_age.items()
        if not np.isnan(v)
    },
}

# Write to both data/ and dashboard/
for path in [
    Path("data/nics_exemption_results.json"),
    Path("dashboard/public/data/nics_exemption_results.json"),
]:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(output, indent=2, default=str) + "\n")
    print(f"  Written to {path}")

print("\nDone!")
