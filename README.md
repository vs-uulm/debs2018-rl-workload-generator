# Workload Generator for Shopping Cart Service

[![DOI](https://img.shields.io/badge/doi-10.1145/3210284.3210285-blue.svg)](https://doi.org/10.1145/3210284.3210285) [![GitHub license](https://img.shields.io/github/license/vs-uulm/debs2018-rl-workload-generator.svg)](https://github.com/vs-uulm/debs2018-rl-workload-generator/blob/master/LICENSE)

Generates a set of workloads with a specified read/write ratio for the example shopping cart service of the [retro-λ evaluation](https://github.com/vs-uulm/debs2018-rl-evaluation).

Dominik Meißner, Benjamin Erb, Frank Kargl, and Matthias Tichy. 2018. RETRO-λ: An Event-sourced Platform for Serverless Applications with Retroactive Computing Support. In DEBS '18: The 12th ACM International Conference on Distributed and Event-based Systems, June 25-29, 2018, Hamilton, New Zealand. ACM, New York, NY, USA, 12 pages. https://doi.org/10.1145/3210284.3210285

## Getting Started
The workload generator requires a [Node.js](https://nodejs.org/) (version >= 9.5.0) installation.
Start by cloning the repository and change into the root directory of the repository.
Use npm to install all runtime dependencies of the workload generator.
```sh
npm install
```

The workloads have to be specified in the `workloads/` directory as `.js` files.
See the existing workload specifications in the `workloads/` directory, which were used in the [retro-λ evaluation](https://github.com/vs-uulm/debs2018-rl-evaluation), for more details.

To generate all workloads, run the start command:
```sh
npm start
```

The resulting workload files can be found in the `out/` directory.
