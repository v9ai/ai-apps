import { cva } from "styled-system/css";

export const animate = cva({
  base: {},
  variants: {
    animation: {
      fadeIn: { animation: "fadeIn 300ms cubic-bezier(0, 0, 0.2, 1) forwards" },
      fadeOut: { animation: "fadeOut 200ms ease forwards" },
      slideUp: { animation: "slideUp 300ms cubic-bezier(0.16, 1, 0.30, 1) forwards" },
      slideDown: { animation: "slideDown 300ms cubic-bezier(0.16, 1, 0.30, 1) forwards" },
      slideLeft: { animation: "slideLeft 300ms cubic-bezier(0.16, 1, 0.30, 1) forwards" },
      slideRight: { animation: "slideRight 300ms cubic-bezier(0.16, 1, 0.30, 1) forwards" },
      scaleIn: { animation: "scaleIn 200ms cubic-bezier(0.16, 1, 0.30, 1) forwards" },
      scaleOut: { animation: "scaleOut 150ms ease forwards" },
      spin: { animation: "spin 1s linear infinite" },
      pulse: { animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" },
      ping: { animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite" },
      none: { animation: "none" },
    },
    delay: {
      none: { animationDelay: "0ms" },
      fast: { animationDelay: "75ms" },
      normal: { animationDelay: "150ms" },
      slow: { animationDelay: "300ms" },
      slower: { animationDelay: "500ms" },
    },
    duration: {
      fastest: { animationDuration: "100ms" },
      fast: { animationDuration: "150ms" },
      normal: { animationDuration: "300ms" },
      slow: { animationDuration: "400ms" },
      slower: { animationDuration: "600ms" },
    },
    reducedMotion: {
      true: {
        animation: "none !important",
        transition: "none !important",
      },
    },
  },
  defaultVariants: {
    delay: "none",
  },
});

export const transition = cva({
  base: {},
  variants: {
    property: {
      all: { transition: "all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)" },
      colors: { transition: "color 150ms ease, background-color 150ms ease, border-color 150ms ease" },
      opacity: { transition: "opacity 200ms ease" },
      transform: { transition: "transform 300ms cubic-bezier(0.16, 1, 0.30, 1)" },
      shadow: { transition: "box-shadow 200ms ease" },
      size: { transition: "width 300ms ease, height 300ms ease" },
      none: { transition: "none" },
    },
    duration: {
      fastest: { transitionDuration: "100ms" },
      fast: { transitionDuration: "150ms" },
      normal: { transitionDuration: "300ms" },
      slow: { transitionDuration: "400ms" },
      slower: { transitionDuration: "600ms" },
    },
    easing: {
      linear: { transitionTimingFunction: "linear" },
      smooth: { transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" },
      expoOut: { transitionTimingFunction: "cubic-bezier(0.16, 1, 0.30, 1)" },
      spring: { transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    },
  },
  defaultVariants: {
    property: "all",
    duration: "normal",
    easing: "smooth",
  },
});

export const stagger = cva({
  base: {
    opacity: 0,
  },
  variants: {
    index: {
      0: { animationDelay: "0ms" },
      1: { animationDelay: "50ms" },
      2: { animationDelay: "100ms" },
      3: { animationDelay: "150ms" },
      4: { animationDelay: "200ms" },
      5: { animationDelay: "250ms" },
      6: { animationDelay: "300ms" },
      7: { animationDelay: "350ms" },
      8: { animationDelay: "400ms" },
      9: { animationDelay: "450ms" },
    },
    animation: {
      fadeIn: { animation: "fadeIn 300ms cubic-bezier(0, 0, 0.2, 1) forwards" },
      slideUp: { animation: "slideUp 300ms cubic-bezier(0.16, 1, 0.30, 1) forwards" },
      scaleIn: { animation: "scaleIn 200ms cubic-bezier(0.16, 1, 0.30, 1) forwards" },
    },
  },
  defaultVariants: {
    index: 0,
    animation: "fadeIn",
  },
});
