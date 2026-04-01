"use client";

import { useMemo } from "react";
import { colors } from "../lib/colors";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SectionHeading from "./SectionHeading";
import { getBaselineSummary, getByAgeGroup, getInactivityReasons } from "../lib/dataHelpers";
import { formatBn, formatCount, formatPct } from "../lib/formatters";
import ChartLogo from "./ChartLogo";

const AXIS_STYLE = {
  fontSize: 12,
  fill: colors.gray[500],
};

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg">
      {label !== undefined ? (
        <div className="mb-2 font-semibold text-slate-800">{label}</div>
      ) : null}
      {payload.map((entry) => (
        <div className="flex items-center justify-between gap-4" key={entry.name}>
          <span className="flex items-center gap-2 text-slate-600">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-medium text-slate-800">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

const NICS_THRESHOLDS = [
  { band: "Below Secondary Threshold", range: "Up to \u00A35,000/yr (\u00A396/wk)", rate: "0%" },
  { band: "Above Secondary Threshold", range: "\u00A35,000+/yr", rate: "15%" },
  { band: "Employment Allowance", range: "Eligible employers", rate: "\u00A310,500 off" },
  { band: "Apprenticeship Levy", range: "Pay bill > \u00A33m", rate: "0.5%" },
];

const OFFICIAL_COMPARISON = [
  {
    metric: "Economically inactive (working age)",
    model: "7.1m",
    official: "~9.0m",
    source: "ONS LFS",
    sourceUrl: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/employmentintheuk/latest",
    note: "FRS under-counts inactive vs LFS",
  },
  {
    metric: "Disabled (working age)",
    model: "5.6m",
    official: "~10.4m",
    source: "DWP 2025",
    sourceUrl: "https://www.gov.uk/government/statistics/the-employment-of-disabled-people-2025",
    note: "Model uses benefit receipt + employment status; official uses Equality Act self-report. FRS collects Equality Act data but PolicyEngine does not yet load it.",
  },
  {
    metric: "Inactive & disabled",
    model: "4.5m",
    official: "~4.2m",
    source: "DWP 2025",
    sourceUrl: "https://www.gov.uk/government/statistics/the-employment-of-disabled-people-2025",
    note: "",
  },
  {
    metric: "Total employer NICs",
    model: "\u00A3151.3bn",
    official: "\u00A3145.8bn",
    source: "OBR March 2025",
    sourceUrl: "https://obr.uk/forecasts-in-depth/tax-by-tax-spend-by-spend/national-insurance-contributions-nics/",
    note: "Both are Class 1 secondary only. 3.8% gap reflects FRS-based microsimulation variance vs HMRC admin data.",
  },
  {
    metric: "Disability benefits spending",
    model: "\u00A353.9bn",
    official: "\u00A355.1bn",
    source: "DWP Spring Statement 2025",
    sourceUrl: "https://www.gov.uk/government/consultations/pathways-to-work-reforming-benefits-and-support-to-get-britain-working-green-paper/spring-statement-2025-health-and-disability-benefit-reforms-impacts",
    note: "Official is 2025\u201326 forecast (\u00A351.2bn in 2024\u201325). Working-age incapacity & disability benefits only.",
  },
];

export default function BaselineTab({ data }) {
  const summary = getBaselineSummary(data);
  const byAge = getByAgeGroup(data, "baseline");
  const inactivityReasons = getInactivityReasons(data);

  const sortedReasons = useMemo(() => {
    if (!inactivityReasons.length) return [];
    return [...inactivityReasons].sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [inactivityReasons]);

  return (
    <div className="space-y-10">

      {/* Summary metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="metric-card">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Economically inactive people
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {summary?.n_economically_inactive ? formatCount(summary.n_economically_inactive) : "--"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Working-age adults not in employment or actively seeking work (official:{" "}
            <a href="https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/economicinactivity" target="_blank" rel="noreferrer" className="underline">
              ~9.0m, ONS
            </a>)
          </div>
        </div>
        <div className="metric-card">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Disabled people
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {summary?.n_disabled ? formatCount(summary.n_disabled) : "--"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {summary?.n_inactive_disabled
              ? `${formatCount(summary.n_inactive_disabled)} also economically inactive`
              : "Including those who are economically inactive"}{" "}
            (official:{" "}
            <a href="https://www.gov.uk/government/statistics/the-employment-of-disabled-people-2025" target="_blank" rel="noreferrer" className="underline">
              ~10.4m Equality Act, DWP
            </a>)
          </div>
        </div>
        <div className="metric-card">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Total employer NICs
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {summary?.total_employer_nics_bn ? formatBn(summary.total_employer_nics_bn) : "--"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Annual employer National Insurance contributions (official:{" "}
            <a href="https://obr.uk/forecasts-in-depth/tax-by-tax-spend-by-spend/national-insurance-contributions-nics/" target="_blank" rel="noreferrer" className="underline">
              £145.8bn, OBR March 2025
            </a>)
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* SECTION 1: DISABILITY AND INACTIVITY                             */}
      {/* ================================================================ */}
      <SectionHeading
        title="Disability and inactivity"
        description="Overlap between disability and economic inactivity, and the main reasons people are economically inactive."
      />

      <div className="grid gap-8 xl:grid-cols-2">
        {/* Disability / inactivity overlap summary */}
        <div className="section-card">
          <SectionHeading
            title="Disability and inactivity overlap"
            description="Breakdown of the working-age population by disability and activity status."
          />
          {summary ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Disability employment rate</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {summary.disabled_employment_rate != null ? `${summary.disabled_employment_rate}%` : "--"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  vs {summary.non_disabled_employment_rate != null ? `${summary.non_disabled_employment_rate}%` : "--"} non-disabled
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">% of inactive who are disabled</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {summary.pct_inactive_disabled != null ? `${summary.pct_inactive_disabled}%` : "--"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Disability benefits spending</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {summary.total_disability_benefits_bn ? formatBn(summary.total_disability_benefits_bn) : "--"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Official:{" "}
                  <a href="https://www.gov.uk/government/consultations/pathways-to-work-reforming-benefits-and-support-to-get-britain-working-green-paper/spring-statement-2025-health-and-disability-benefit-reforms-impacts" target="_blank" rel="noreferrer" className="underline">
                    £55.1bn, DWP 2025–26
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Summary data not yet available.</p>
          )}
        </div>

        {/* Inactivity reasons */}
        {sortedReasons.length > 0 && (
          <div className="section-card">
            <SectionHeading
              title="Reasons for inactivity"
              description="Main reasons people give for being economically inactive."
            />
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedReasons} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border.light} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={AXIS_STYLE}
                    tickLine={false}
                    tickFormatter={(v) => formatCount(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="reason"
                    tick={{ ...AXIS_STYLE, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={160}
                  />
                  <Tooltip content={<CustomTooltip formatter={(v) => formatCount(v)} />} />
                  <Bar dataKey="count" name="People" fill={colors.primary[600]} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ChartLogo />
          </div>
        )}

        {sortedReasons.length === 0 && (
          <div className="section-card">
            <SectionHeading
              title="Reasons for inactivity"
              description="Main reasons people give for being economically inactive."
            />
            <p className="text-sm text-slate-500">Inactivity reason data not yet available.</p>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* SECTION 2: CURRENT EMPLOYER NICs                                 */}
      {/* ================================================================ */}
      <div className="border-t border-slate-200 pt-10">
        <SectionHeading
          title="Current employer NICs"
          description="Employer National Insurance contributions by age group and the current rate structure."
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        {byAge.length > 0 && (
          <div className="section-card">
            <SectionHeading
              title="Employer NICs by age group"
              description="Total employer NICs paid for employees in each age band."
            />
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byAge}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border.light} />
                  <XAxis
                    dataKey="age_group"
                    tick={AXIS_STYLE}
                    tickLine={false}
                  />
                  <YAxis
                    tick={AXIS_STYLE}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `\u00A3${v}bn`}
                  />
                  <Tooltip content={<CustomTooltip formatter={(v) => formatBn(v)} />} />
                  <Bar
                    dataKey="employer_nics_bn"
                    name="Employer NICs"
                    fill={colors.primary[600]}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ChartLogo />
          </div>
        )}

        <div className="section-card">
          <SectionHeading
            title="NICs rates and thresholds"
            description="Current employer NICs rate structure (2025-26 tax year)."
          />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Band</th>
                  <th>Earnings range</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {NICS_THRESHOLDS.map((row) => (
                  <tr key={row.band}>
                    <td className="font-medium">{row.band}</td>
                    <td>{row.range}</td>
                    <td>{row.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* SECTION 3: MODEL VS OFFICIAL STATISTICS                          */}
      {/* ================================================================ */}
      <div className="border-t border-slate-200 pt-10">
        <SectionHeading
          title="Model vs official statistics"
          description="Comparison of PolicyEngine model estimates with published government statistics. Differences reflect definitional choices (e.g. benefit-receipt vs Equality Act disability) and the underlying survey (FRS vs LFS)."
        />
      </div>

      <div className="section-card overflow-x-auto">
        <table className="data-table" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "25%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Metric</th>
              <th style={{ textAlign: "right" }}>Model</th>
              <th style={{ textAlign: "right" }}>Official</th>
              <th>Source</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {OFFICIAL_COMPARISON.map((row) => (
              <tr key={row.metric}>
                <td className="font-medium">{row.metric}</td>
                <td style={{ textAlign: "right" }}>{row.model}</td>
                <td style={{ textAlign: "right" }}>{row.official}</td>
                <td>
                  <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="text-primary-700 underline">
                    {row.source}
                  </a>
                </td>
                <td className="text-xs text-slate-500">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
