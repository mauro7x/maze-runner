# TODO

## Cliente

- [ ] Finalizar funcionamiento de un nivel básico:
  - [ ] Que los eventos se envíen solo mientras el usuario tiene apretado el click.
  - [ ] Se reinicia la posición a la linea de salida:
    - [ ] Cuando el usuario suelta el click.
    - [ ] Cuando el usuario colisiona.
    - [ ] Cuando el usuario gana.
  - [ ] Recibir eventos y graficar otros usuarios.
  - [ ] Scores:
    - [ ] Tabla de scores.
    - [ ] Arreglar la suma de scores, que sume solo una vez.
    - [ ] Centralizar esta decisión en el owner de la sala?
- [ ] Creación de salas:
  - [ ] Creación página inicial para crear sala o unirme a una.
  - [ ] Vista administrador (owner de la sala) vs. vista jugador.
- [ ] Posibilidad de cambiar de mapa:
  - [ ] Múltiples mapas v1: preset de mapas hechos por nosotros.
  - [ ] Múltiples mapas v2: generación al azar.

## Infra

- [x] Crear definición de docker compose para broker básico single-node.
- [ ] Modificar definición para broker con 2 nodos estáticos.
- [ ] Crear un cluster de N nodos dinámicos con Kubernetes.
- [ ] Desplegar el juego terminado en un host estático (github pages?).

## Presentación

- [ ] Preparar presentación.
