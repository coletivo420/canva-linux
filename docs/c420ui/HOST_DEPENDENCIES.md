# c420ui Host Dependencies

c420ui owns host dependency management. It validates command, Node.js and npm dependency declarations, supports dry-run reporting for planned dependency actions, and keeps npm dependency policy out of dependent project shell helpers.

Dependent projects declare dependency requirements in project configuration. Canva Linux declares those requirements in `config/canva-linux/dependencies.json`.
