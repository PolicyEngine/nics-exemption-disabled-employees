# NICs Exemption for Recently-Inactive Employees

Interactive dashboard estimating the cost, employment effects, and poverty impact of exempting employers from National Insurance contributions on all employees who recently transitioned from economic inactivity into work (disabled and non-disabled), using [PolicyEngine UK](https://github.com/PolicyEngine/policyengine-uk) microsimulation.

## Quick start

### Python pipeline

```bash
pip install -e ".[dev,simulation]"
conda activate python313
python run_pipeline.py
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev
```

## Architecture

```
nics-exemption-inactive-employees/
├── src/nics_exemption/     # Python pipeline + analysis
├── run_pipeline.py         # Main pipeline script
├── data/                   # Generated JSON output
└── dashboard/              # Next.js dashboard
```

## Data sources

- Enhanced Family Resources Survey 2023-24 via PolicyEngine UK
- Labour Force Survey (5-quarter longitudinal, 2022-23) for inactivity transitions
- microimpute library for statistical imputation (LFS → FRS)

## Running tests

```bash
pytest
```
