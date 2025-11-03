# HomeEffortIndex

A visual representation of housing affordability across European NUTS2 regions, showing the years of work needed to buy a house based on regional salaries and national housing prices.

## Overview

This interactive map visualizes housing affordability across Europe using:
- **NUTS2 regional salary data** from EUROSTAT (2020)
- **National housing price indices** from EUROSTAT (2020)

The calculation methodology:
1. Calculates national average salaries from NUTS2 regional data
2. Computes regional salary ratios (regional_salary / national_average)
3. Estimates regional housing prices (national_price × regional_ratio)
4. Calculates years needed to buy a house (regional_housing_price / regional_salary)

Regions are color-coded:
- 🟢 **Green**: Fewer years needed (more affordable)
- 🟡 **Yellow**: Moderate years needed
- 🔴 **Red**: More years needed (less affordable)

## Data Processing

The data processing script (`/tmp/process_housing_data.py`) transforms raw EUROSTAT data into the housing affordability index. For countries without housing price data, the European average is used.

Generated file: `public/housing_affordability.json`

## Project Structure

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
