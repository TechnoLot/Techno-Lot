// Palette stricte : noir #050505, blanc cassé #F2F2EE, vert #5ECB33.
// La passe finale remappe [0, 1] sur [noir, blanc cassé] : ink() précompense une
// couleur « à plat » (matériau non éclairé) pour qu'elle sorte exactement à l'écran.
import * as THREE from "three";

export const HEX = { black: "#050505", white: "#F2F2EE", green: "#5ECB33" };
const B = [5, 5, 5].map((v) => v / 255);
const W = [242, 242, 238].map((v) => v / 255);

export function ink(hex, gain = 1) {
  const c = new THREE.Color(hex); // ColorManagement : stocké en linéaire
  const s = c.clone().convertLinearToSRGB();
  const k = [s.r, s.g, s.b].map((v, i) => Math.min(1, Math.max(0, (v - B[i]) / (W[i] - B[i]))));
  return new THREE.Color().setRGB(k[0], k[1], k[2], THREE.SRGBColorSpace).multiplyScalar(gain);
}

export const C = {
  black: ink(HEX.black),
  white: ink(HEX.white),
  green: ink(HEX.green),
  glow: ink(HEX.green, 2.4), // vert lumineux (halo)
  grey: ink("#8A8A86"),
  dim: ink("#3A3A38"),
};

// Fond « papier » des plans blancs : exactement #F2F2EE à l'écran
export const PAPER = new THREE.Color(1, 1, 1);
export const NIGHT = new THREE.Color(0, 0, 0);
