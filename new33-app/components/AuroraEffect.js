import { useEffect, useRef } from 'react';

const AuroraEffect = () => {
  const canvasRef = useRef(null);
  const webglRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl");
    
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    let pointer = [0.5, 0.5];

    const handlePointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer[0] = (e.clientX - rect.left) / rect.width;
      pointer[1] = 1.0 - (e.clientY - rect.top) / rect.height;
    };

    canvas.addEventListener("pointermove", handlePointerMove);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    };
    window.addEventListener("resize", resize);
    resize();

    const vert = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0, 1);
      }
    `;

    const frag = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_pointer;

      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution;
        float wave = sin((st.x + u_time * 0.05) * 8.0) * 0.15;
        float pointerDist = distance(st, u_pointer);
        float ripple = exp(-pointerDist * 8.0) * sin(pointerDist * 30.0 - u_time * 2.0) * 0.3;

        float brightness = smoothstep(0.3, 0.7, st.y + wave + ripple);
        
        // Elegant colors that match the website theme
        vec3 color = vec3(
          0.7 + 0.3 * brightness,                    // Warm white
          0.65 + 0.25 * sin(u_time * 0.5 + st.x * 2.0), // Subtle warm tone
          0.6 + 0.2 * brightness                     // Slight cool balance
        );
        
        // Make it more transparent and subtle
        float alpha = brightness * 0.4;
        gl_FragColor = vec4(color, alpha);
      }
    `;

    function createShader(type, src) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile failed:", gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    }

    const vs = createShader(gl.VERTEX_SHADER, vert);
    const fs = createShader(gl.FRAGMENT_SHADER, frag);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const pos = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u_resolution = gl.getUniformLocation(program, "u_resolution");
    const u_time = gl.getUniformLocation(program, "u_time");
    const u_pointer = gl.getUniformLocation(program, "u_pointer");

    let start = Date.now();
    let animationFrame;
    
    const render = () => {
      const t = (Date.now() - start) / 1000;
      gl.uniform2f(u_resolution, canvas.width, canvas.height);
      gl.uniform1f(u_time, t);
      gl.uniform2fv(u_pointer, pointer);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      canvas.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
};

export default AuroraEffect; 