import { useEffect, useRef } from 'react';

const ColorMixEffect = ({ selectedColor = [0.8, 0.8, 0.8] }) => {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    
    class Renderer {
      #vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;
      
      #vertices = [-1, 1, -1, -1, 1, 1, 1, -1];
      
      constructor(canvas, scale) {
        this.canvas = canvas;
        this.scale = scale;
        this.gl = canvas.getContext("webgl2");
        if (!this.gl) {
          console.error('WebGL2 not supported');
          return;
        }
        this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale);
        this.mouseCoords = [0, 0];
        this.pointerCoords = [0, 0];
        this.nbrOfPointers = 0;
      }
      
      compile(shader, source) {
        const gl = this.gl;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error(gl.getShaderInfoLog(shader));
        }
      }
      
      setup(fragmentSource) {
        const gl = this.gl;
        this.vs = gl.createShader(gl.VERTEX_SHADER);
        this.fs = gl.createShader(gl.FRAGMENT_SHADER);
        this.compile(this.vs, this.#vertexSrc);
        this.compile(this.fs, fragmentSource);
        this.program = gl.createProgram();
        gl.attachShader(this.program, this.vs);
        gl.attachShader(this.program, this.fs);
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
          console.error(gl.getProgramInfoLog(this.program));
        }
      }
      
      init() {
        const { gl, program } = this;
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(this.#vertices),
          gl.STATIC_DRAW
        );
        const position = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        
        program.resolution = gl.getUniformLocation(program, "resolution");
        program.time = gl.getUniformLocation(program, "time");
        program.selectedColor = gl.getUniformLocation(program, "selectedColor");
      }
      
      updateScale(scale) {
        this.scale = scale;
        this.gl.viewport(
          0,
          0,
          this.canvas.width * scale,
          this.canvas.height * scale
        );
      }
      
      render(now = 0, selectedColor = [0.8, 0.8, 0.8]) {
        const { gl, program, buffer, canvas } = this;
        if (!program || gl.getProgramParameter(program, gl.DELETE_STATUS)) return;
        
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.uniform2f(program.resolution, canvas.width, canvas.height);
        gl.uniform1f(program.time, now * 1e-3);
        gl.uniform3fv(program.selectedColor, selectedColor);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    // 수정된 Fragment Shader - 선택된 색상과 혼합
    const fragmentSource = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 selectedColor;
#define FC gl_FragCoord.xy
#define R resolution
#define MN min(R.x,R.y)
#define T (time+660.)
#define S smoothstep
#define N normalize
#define rot(a) mat2(cos((a)-vec4(0,11,33,0)))

float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}

float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f), k=vec2(1,0);
  float
  a=rnd(i),
  b=rnd(i+k),
  c=rnd(i+k.yx),
  d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}

float fbm(vec2 p) {
  float t=.0, a=1., h=.0; mat2 m=mat2(1.,-1.2,.2,1.2);
  for (float i=.0; i<5.; i++) {
    t+=a*noise(p);
    p*=2.*m;
    a*=.5;
    h+=a;
  }
  return t/h;
}

void main() {
  vec2 uv=(FC-.5*R)/R.y, k=vec2(0,T*.015); 
  vec3 col=vec3(1);
  uv.x+=.25;
  uv*=vec2(2,1);
  float n=fbm(uv*.28+vec2(-T*.01,0));
  n=noise(uv*3.+n*2.);
  col.r-=fbm(uv+k+n);
  col.g-=fbm(uv*1.003+k+n+.003);
  col.b-=fbm(uv*1.006+k+n+.006);
  col=mix(col,vec3(1),dot(col,vec3(.21,.71,.07)));
  
  // 선택된 색상과 혼합
  col = mix(col, selectedColor, 0.6);
  
  col=mix(vec3(.08),col,min(time*.1,1.));
  col=clamp(col,.08,1.);
  O=vec4(col,1);
}`;

    const dpr = Math.max(1, devicePixelRatio);
    const renderer = new Renderer(canvas, dpr);
    
    const resize = () => {
      const { innerWidth: width, innerHeight: height } = window;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      if (renderer) {
        renderer.updateScale(dpr);
      }
    };
    
    renderer.setup(fragmentSource);
    renderer.init();
    resize();
    
    window.addEventListener('resize', resize);
    
    let animationFrame;
    const loop = (now) => {
      renderer.render(now, selectedColor);
      animationFrame = requestAnimationFrame(loop);
    };
    loop(0);
    
    rendererRef.current = renderer;

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener('resize', resize);
    };
  }, [selectedColor]);

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

export default ColorMixEffect; 