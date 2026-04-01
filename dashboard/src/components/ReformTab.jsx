"use client";

import { useMemo, useState } from "react";
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
import {
  getReformSummary,
  getNicsExemption,
  getByAgeGroup,
  getCombinedPctActiveByAge,
} from "../lib/dataHelpers";
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
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function BreakdownTable({ dimension, byAge, data, totalRecentlyActive, costBn }) {
  const dimData = useMemo(() => {
    if (dimension === "age") return null; // use byAge directly
    const key = `by_${dimension}`;
    return data?.reform?.nics_exemption?.[key] || [];
  }, [dimension, data]);

  if (dimension === "age") {
    return (
      <table className="data-table" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "40%" }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: "30%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Age group</th>
            <th style={{ textAlign: "right" }}>Active within 5Q</th>
            <th style={{ textAlign: "right" }}>Exemption cost</th>
          </tr>
        </thead>
        <tbody>
          {byAge.map((row) => (
            <tr key={row.age_group}>
              <td className="font-medium">{row.age_group}</td>
              <td style={{ textAlign: "right" }}>{formatCount(row.n_recently_active)}</td>
              <td style={{ textAlign: "right" }}>{formatBn(row.nics_exemption_cost_bn)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-300 font-semibold">
            <td>Total</td>
            <td style={{ textAlign: "right" }}>{formatCount(totalRecentlyActive)}</td>
            <td style={{ textAlign: "right" }}>{costBn != null ? formatBn(costBn) : "--"}</td>
          </tr>
        </tbody>
      </table>
    );
  }

  if (!dimData || dimData.length === 0) {
    return <p className="text-sm text-slate-500">Breakdown data not yet available. Re-run the pipeline to generate.</p>;
  }

  const dimLabel = dimension === "gender" ? "Gender" : dimension === "country" ? "Country" : "Household type";
  const totalActive = dimData.reduce((s, r) => s + (r.n_recently_active || 0), 0);
  const totalCost = dimData.reduce((s, r) => s + (r.nics_exemption_cost_bn || 0), 0);

  return (
    <table className="data-table" style={{ tableLayout: "fixed" }}>
      <colgroup>
        <col style={{ width: "40%" }} />
        <col style={{ width: "30%" }} />
        <col style={{ width: "30%" }} />
      </colgroup>
      <thead>
        <tr>
          <th>{dimLabel}</th>
          <th style={{ textAlign: "right" }}>Active within 5Q</th>
          <th style={{ textAlign: "right" }}>Exemption cost</th>
        </tr>
      </thead>
      <tbody>
        {dimData.map((row) => (
          <tr key={row.group}>
            <td className="font-medium">{row.group}</td>
            <td style={{ textAlign: "right" }}>{formatCount(row.n_recently_active)}</td>
            <td style={{ textAlign: "right" }}>{formatBn(row.nics_exemption_cost_bn)}</td>
          </tr>
        ))}
        <tr className="border-t-2 border-slate-300 font-semibold">
          <td>Total</td>
          <td style={{ textAlign: "right" }}>{formatCount(totalActive)}</td>
          <td style={{ textAlign: "right" }}>{formatBn(totalCost)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export default function ReformTab({ data }) {
  const summary = getReformSummary(data);
  const nicsExemption = getNicsExemption(data);
  const byAge = getByAgeGroup(data, "reform");
  const combinedPctActive = getCombinedPctActiveByAge(data);

  const [breakdownDim, setBreakdownDim] = useState("age");

  const totalRecentlyActive = useMemo(() => {
    return byAge
      .filter((d) => d.age_group !== "65+")
      .reduce((sum, d) => sum + (d.n_recently_active || 0), 0);
  }, [byAge]);

  return (
    <div className="space-y-8">
      <SectionHeading
        title="NICs exemption reform analysis"
        description={<>Estimated cost of exempting employers from NICs on employees who transitioned from economic inactivity into work within the last 5 quarters (15 months). Figures are based on PolicyEngine UK microsimulation with <a href="https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/methodologies/labourforcesurveyuserguidance" target="_blank" rel="noreferrer" className="underline">LFS longitudinal data</a> imputed onto the Enhanced FRS.</>}
      />

      {/* Summary metric cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="metric-card">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Static cost of exemption
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {summary?.cost_bn != null ? formatBn(summary.cost_bn) : "--"}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Foregone employer NICs revenue per year
          </div>
        </div>
        <div className="metric-card">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Recently-active employees (5Q)
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {totalRecentlyActive > 0 ? formatCount(totalRecentlyActive) : "--"}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Working-age people who transitioned from inactivity within the last 5 quarters.{" "}
            <a href="https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/labourforcesurveyflowsestimatesx02" target="_blank" rel="noreferrer" className="underline">
              ONS X02 flows
            </a>{" "}
            shows 578k moving from inactivity to employment per quarter (Oct–Dec 2025)
          </div>
        </div>
        <div className="metric-card">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Avg saving per exempt hire
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {data?.reform?.nics_exemption?.summary?.avg_nics_per_recent_worker != null
              ? `\u00A3${data.reform.nics_exemption.summary.avg_nics_per_recent_worker.toLocaleString()}`
              : "--"}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Average annual employer NICs per recently-active worker (vs £{data?.baseline?.summary?.avg_nics_per_worker?.toLocaleString() ?? "--"} across all employees)
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* SECTION 1: EXEMPTION COST BY AGE                                 */}
      {/* ================================================================ */}
      <SectionHeading
        title="Exemption cost by age group"
        description="Employer NICs that would be foregone under the exemption, broken down by age group of the employee who became active within the last 5 quarters (15 months)."
      />

      {byAge.length > 0 ? (
        <div className="section-card">
          <SectionHeading
            title="NICs exemption cost by age"
            description="Estimated annual cost (£bn) of exempting employer NICs for workers who became active within the last 5 quarters."
          />
          <div className="h-[380px] w-full">
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
                  tickFormatter={(v) => `£${v}bn`}
                />
                <Tooltip content={<CustomTooltip formatter={(v) => formatBn(v)} />} />
                <Bar
                  dataKey="nics_exemption_cost_bn"
                  name="Exemption cost"
                  fill={colors.primary[600]}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ChartLogo />
        </div>
      ) : (
        <div className="section-card">
          <p className="text-sm text-slate-500">Age group data not yet available.</p>
        </div>
      )}

      {/* ================================================================ */}
      {/* SECTION 2: % BECOMING ACTIVE BY AGE (key charts from notebook)   */}
      {/* ================================================================ */}
      <div className="border-t border-slate-200 pt-10">
        <SectionHeading
          title="Percentage becoming economically active within 5 quarters, by age"
          description={<>The left chart shows the raw <a href="https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/methodologies/labourforcesurveyuserguidance" target="_blank" rel="noreferrer" className="underline">Labour Force Survey</a> 5-quarter longitudinal panel data; the right shows the same variable after imputation onto the PolicyEngine Enhanced FRS population.</>}
        />
      </div>

      {combinedPctActive.length > 0 ? (
        <div className="grid gap-8 xl:grid-cols-2">
          <div className="section-card">
            <SectionHeading
              title="LFS: % becoming active by age (5-quarter window)"
              description="Percentage of people who became economically active in the last 5 quarters, by age (raw LFS weighted data)."
            />
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={combinedPctActive}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border.light} />
                  <XAxis
                    dataKey="age"
                    tick={AXIS_STYLE}
                    tickLine={false}
                  />
                  <YAxis
                    tick={AXIS_STYLE}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        formatter={(v) => v != null ? `${(v * 100).toFixed(1)}%` : "N/A"}
                      />
                    }
                  />
                  <Bar
                    dataKey="lfs"
                    name="% becoming active (LFS)"
                    fill={colors.primary[600]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ChartLogo />
          </div>

          <div className="section-card">
            <SectionHeading
              title="Imputed: recently-active in Enhanced FRS (5-quarter window)"
              description="Imputed probability of becoming active within 5 quarters, after statistical matching from LFS onto the PolicyEngine population."
            />
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={combinedPctActive}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border.light} />
                  <XAxis
                    dataKey="age"
                    tick={AXIS_STYLE}
                    tickLine={false}
                  />
                  <YAxis
                    tick={AXIS_STYLE}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        formatter={(v) => v != null ? `${(v * 100).toFixed(1)}%` : "N/A"}
                      />
                    }
                  />
                  <Bar
                    dataKey="frs"
                    name="% becoming active (imputed)"
                    fill={colors.primary[700]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ChartLogo />
          </div>
        </div>
      ) : (
        <div className="section-card">
          <p className="text-sm text-slate-500">Activity-by-age data not yet available.</p>
        </div>
      )}

      {/* ================================================================ */}
      {/* SECTION 3: DETAILED BREAKDOWN TABLE                              */}
      {/* ================================================================ */}
      {byAge.length > 0 && (
        <>
          <div className="border-t border-slate-200 pt-10">
            <SectionHeading
              title="Detailed breakdown"
              description="Summary table of the NICs exemption cost and workers who became active within 5 quarters, by selected dimension."
            />
          </div>

          <div className="section-card overflow-x-auto">
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                { id: "age", label: "Age group" },
                { id: "gender", label: "Gender" },
                { id: "country", label: "Country" },
                { id: "family_type", label: "Household type" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    breakdownDim === opt.id
                      ? "bg-primary-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  onClick={() => setBreakdownDim(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <BreakdownTable
              dimension={breakdownDim}
              byAge={byAge}
              data={data}
              totalRecentlyActive={totalRecentlyActive}
              costBn={summary?.cost_bn}
            />
          </div>
        </>
      )}
    </div>
  );
}
