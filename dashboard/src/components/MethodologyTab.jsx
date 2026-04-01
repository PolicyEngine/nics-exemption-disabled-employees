export default function MethodologyTab({ data }) {
  return (
    <div className="space-y-8">
      <div className="section-card">
        <div className="eyebrow text-slate-500">Overview</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          How the model works
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          This dashboard estimates the employment and fiscal effects of
          exempting employers from National Insurance contributions (NICs) on
          new hires who are disabled or have been economically inactive for
          over a year. The model is labour-supply-side only, assuming full
          pass-through of NICs to wages: if employer NICs are removed, the
          full value is reflected in higher gross wages offered to potential
          employees. For each economically inactive individual in the
          microdata, we impute a target wage using observable characteristics,
          apply the NICs exemption to calculate the effective wage increase,
          and estimate the probability of entering work using participation
          elasticities from the empirical literature. All figures are for the{" "}
          {data?.year || "2025"} fiscal year.
        </p>
      </div>

      <div className="section-card">
        <div className="eyebrow text-slate-500">Key assumption</div>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">
          Full pass-through of NICs to wages
        </h3>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          The central assumption is that employer NICs are fully passed
          through to wages. When an employer is exempt from paying NICs on a
          new hire, the full saving is reflected in the wage offered. This is
          the standard incidence assumption in public finance and is
          supported by empirical evidence on payroll tax incidence (e.g.,
          Saez, Matsaganis &amp; Tsakloglou 2012). In practice, pass-through
          may be partial, which would reduce the estimated employment
          effects.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-3">
        <div className="section-card">
          <div className="eyebrow text-slate-500">Included</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            What the model captures
          </h3>
          <ul className="mt-4 list-disc pl-5 text-sm leading-7 text-slate-600 space-y-1">
            <li>Labour supply responses via participation elasticities</li>
            <li>Wage imputation for economically inactive individuals</li>
            <li>Employment effects by age, income decile, and disability status</li>
            <li>Poverty impact from increased employment</li>
            <li>Fiscal cost of the NICs exemption</li>
            <li>Comparison with disability benefit cuts as counterfactual</li>
          </ul>
        </div>

        <div className="section-card">
          <div className="eyebrow text-slate-500">Excluded</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            What the model omits
          </h3>
          <ul className="mt-4 list-disc pl-5 text-sm leading-7 text-slate-600 space-y-1">
            <li>Employer demand-side effects (hiring decisions beyond wage cost)</li>
            <li>General equilibrium effects on the wider labour market</li>
            <li>Displacement of existing workers by newly hired employees</li>
            <li>Deadweight loss from employers who would have hired anyway</li>
            <li>Administrative costs of verifying eligibility</li>
            <li>Behavioural responses beyond the extensive margin of labour supply</li>
          </ul>
        </div>

        <div className="section-card">
          <div className="eyebrow text-slate-500">Sources</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            Data and references
          </h3>
          <ul className="mt-4 list-disc pl-5 text-sm leading-7 text-slate-600 space-y-1">
            <li>PolicyEngine UK microsimulation model</li>
            <li>Enhanced Family Resources Survey 2023-24</li>
            <li>Labour Force Survey for imputation of target wages</li>
            <li>Participation elasticities from Meghir &amp; Phillips (2010)</li>
            <li>ONS disability and economic inactivity statistics</li>
            <li>HMRC employer NICs data</li>
          </ul>
        </div>
      </div>

      <div className="section-card">
        <div className="eyebrow text-slate-500">Caveats</div>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">
          Important limitations
        </h3>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Static analysis</h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              All estimates are static: they model the immediate effect of the
              NICs exemption on labour supply without accounting for dynamic
              adjustments in the economy over time. Real-world outcomes would
              depend on the speed and extent of employer and worker responses.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Imputation uncertainty</h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Target wages for economically inactive individuals are imputed
              from observed characteristics using a microimpute approach. This
              introduces uncertainty, particularly for individuals who have
              been out of work for long periods and whose potential wages are
              harder to predict.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Elasticity assumptions</h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              The employment effects depend on the choice of participation
              elasticity. We use central estimates from the UK literature, but
              these are estimated with uncertainty and may vary across
              demographic groups and over time.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Pass-through assumption</h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Full pass-through of NICs to wages is a strong assumption. If
              employers retain some of the NICs saving as higher profits
              rather than passing it to workers, employment effects would be
              smaller than estimated.
            </p>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="eyebrow text-slate-500">Replication</div>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">
          Code and data pipeline
        </h3>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          A Python pipeline generates <code>nics_exemption_results.json</code>,
          which the dashboard consumes at build time. The pipeline uses
          PolicyEngine UK for tax-benefit calculations and the microimpute
          library for wage imputation of inactive individuals. The approach
          follows Nikhil&apos;s notebook methodology for estimating
          participation responses. All source code, data processing scripts,
          and configuration are available in the{" "}
          <a
            href="https://github.com/PolicyEngine/nics-exemption-disabled-employees"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            public repository
          </a>.
        </p>
      </div>
    </div>
  );
}
