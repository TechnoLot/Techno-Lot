// Pack d'animations DOM de framer-motion, isolé dans son propre chunk :
// importé dynamiquement par MotionProvider APRÈS le rendu initial, il ne
// pèse plus sur le JavaScript critique des pages.
export { domAnimation as default } from "framer-motion";
