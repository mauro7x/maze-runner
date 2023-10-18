# TODO

## Cliente

- [ ] Finalizar funcionamiento de un nivel básico:
  - [x] Que los eventos se envíen solo mientras el usuario tiene apretado el click.
  - [x] Se reinicia la posición:
    - [x] Cuando el usuario suelta el click.
    - [ ] Cuando el usuario colisiona.
    - [ ] Cuando el usuario gana.
    - [ ] El reinicio es a la linea de salida.
  - [x] Recibir eventos y graficar otros usuarios.
  - [ ] Scores:
    - [ ] Tabla de scores.
    - [ ] Arreglar la suma de scores, que sume solo una vez.
    - [ ] Centralizar esta decisión en el owner de la sala?
- [x] Creación de salas:
  - [x] Creación página inicial para crear sala o unirme a una.
  - [x] Vista administrador (owner de la sala) vs. vista jugador.
- [ ] Estilos:
  - [ ] Fijarse que funcione bien con el re-size de la ventana.
  - [ ] Fijarse que funcione bien en celulares.
- [ ] Posibilidad de cambiar de mapa:
  - [ ] Múltiples mapas v1: preset de mapas hechos por nosotros.
  - [ ] Múltiples mapas v2: generación al azar.
- [ ] Eliminar jugadores que se van.

## Infra

- [x] Crear definición de docker compose para broker básico single-node.
- [ ] Modificar definición para broker con 2 nodos estáticos.
- [ ] Crear un cluster de N nodos dinámicos con Kubernetes.
- [ ] Desplegar el juego terminado en un host estático (github pages?).

## Presentación

- [ ] Diagrama de arquitectura.
- [ ] Preparar informe.
- [ ] Preparar presentación (slides).
