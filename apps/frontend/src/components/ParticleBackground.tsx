import React, { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

const options: ISourceOptions = {
  autoPlay: true,
  background: {
    color: {
      value: "transparent",
    },
  },
  fullScreen: {
    enable: true,
    zIndex: 0,
  },
  fpsLimit: 60,
  interactivity: {
    detectsOn: "window",
    events: {
      onClick: { enable: false },
      onHover: { enable: false },
      resize: { enable: true },
    },
  },
  particles: {
    color: {
      value: ["#ffffff", "#df7f3e"],
    },
    move: {
      enable: true,
      direction: "none",
      speed: { min: 0.1, max: 1 },
      random: false,
      straight: false,
      outModes: {
        default: "out",
      },
      attract: {
        enable: false,
        rotate: {
          x: 3000,
          y: 3000,
        },
      },
    },
    number: {
      density: {
        enable: true,
        width: 1920,
        height: 1080,
      },
      value: 55,
    },
    opacity: {
      value: { min: 0.05, max: 0.5 },
      animation: {
        enable: true,
        speed: 1,
        sync: false,
        startValue: "random",
        destroy: "none",
      },
    },
    shape: {
      type: "circle",
    },
    size: {
      value: { min: 1, max: 3 },
      animation: {
        enable: false,
        speed: 5,
      },
    },
    links: {
      enable: false,
    },
  },
  detectRetina: true,
};

const ParticleBackground = React.memo(() => {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  if (!init) return null;

  return (
    <Particles
      id="tsparticles"
      options={options}
    />
  );
});

ParticleBackground.displayName = 'ParticleBackground';

export default ParticleBackground;
