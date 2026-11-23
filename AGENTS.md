# Station AI Guidelines

Station is a single node shared infrastructure runtime.

Station binary (bin/station) is a part of $PATH or installed in existing PATH folder. Station's usage is similar to rails or flutter usage: it allows to create an empty project, update configurations, deploy on specified hosts.

Implementation language: python 3.

## Testing instructions

  - Run `bin/station create sample_project` to regenerate the project from `sample_project/station.yaml`.
  - Cleanup `tmp/` folder and run `bin/station create tmp/sample_project` to create an empty project.
  - Run `../bin/station deploy` in sample_project folder.
  - Run `../bin/station destroy` in sample_project folder.

## Structure

Structure of station project, as seen in sample_project folder:

```text
sample_project/
├── deployments/
│   ├── development/
│   ├── production/
│   ├── test/
└── station.yaml
```

## Naming conventions

  - project name: lowercase with underscores
  - folders, source files, packages: lowercase with underscores
