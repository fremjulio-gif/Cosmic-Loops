# Cosmic Loops

**Cosmic Loops** est un sampler spatial minimaliste construit à partir des sonifications officielles **NASA Chandra — A Universe of Sound** : **45 objets célestes réels** (nébuleuses, supernovas, trous noirs, galaxies, amas, planètes et symphonies), **146 couches audio** par bande spectrale et **137 photographies officielles** issues des télescopes Chandra, Hubble, James Webb, Spitzer, IXPE, NuSTAR, VLA et EHT.

## Fonctionnalités

- **Galerie Spatiale (45 astres)** : navigation par famille, recherche par astre ou télescope, et écoute rapide directe sur chaque carte.
- **Photographies NASA interactives & zoomables** : zoom fluide à la molette ou au pinch tactile (`1.0×` à `4.5×`), déplacement panoramique, double-clic pour zoomer, inspection plein écran, et bascule automatique de photo lorsqu'une couche spectrale (X-Ray, Optique, Infrarouge, Radio…) est isolée.
- **Faisceau de lecture synchronisé** : visualisation fidèle à la géométrie réelle NASA de chaque sonification (balayage horizontal, vertical, radar horaire ou onde radiale).
- **Loop Sampler façon FL Studio + Export `.wav`** :
  - Activation/désactivation des couches spectrales sans doublage avec le mix composite.
  - Cadrage interactif de la boucle sur la forme d'onde (glisser la fenêtre ou ajuster les bornes).
  - Calage temporel libre ou par mesures (**1 / 2 / 4 / 8 mesures**) au **BPM** (`60–180`) et **Pitch** (`-12` à `+12` demi-tons).
  - Export **`.wav` stéréo 16-bit lossless** calé exactement sur le BPM avec fondu anti-clic de 5 ms.
- **Sources vérifiées NASA** : chaque fiche inclut la description scientifique officielle NASA Chandra et le lien direct vers `chandra.cfa.harvard.edu`.

## Développement local

```bash
npm install
npm run dev
```

Build de production :

```bash
npm run build
npm run preview
```

## Sources & Crédits scientifiques

- Sonifications et données astronomiques : **NASA / CXC / SAO / Kimberly Arcand / SYSTEM Sounds (Matt Russo & Andrew Santaguida)** — [A Universe of Sound](https://chandra.cfa.harvard.edu/sound/)
