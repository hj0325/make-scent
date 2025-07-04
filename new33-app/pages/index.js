import Head from "next/head";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Renderer, PointerHandler } from "../lib/shader";
import Navigation from "../components/Navigation";
import AuroraEffect from "../components/AuroraEffect";
import ColorMixEffect from "../components/ColorMixEffect";

export default function Home() {
  const canvasRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0); // 0: main, 1: page1, 2: page2, 3: page3, etc.
  const [selectedOptions, setSelectedOptions] = useState([]);

  // 각 심리 옵션별 색상 정의 (RGB 0-1 범위)
  const psychologicalColors = {
    0: [1.0, 0.2, 0.2], // 1. 휴식이 필요하다 → 빨강
    1: [0.2, 0.4, 1.0], // 2. 위로가 필요하다 → 파랑  
    2: [1.0, 1.0, 0.2], // 3. 안정이 필요하다 → 노랑
    3: [0.2, 0.8, 0.2], // 4. 대화가 필요하다 → 초록
    4: [1.0, 0.4, 0.8], // 5. 기분전환이 필요하다 → 분홍
    5: [1.0, 0.6, 0.2]  // 6. 도전이 필요하다 → 주황
  };

  const psychologicalOptions = [
    "휴식이 필요하다.",
    "위로가 필요하다.",
    "안정이 필요하다.",
    "대화가 필요하다.",
    "기분전환이 필요하다.",
    "도전이 필요하다."
  ];

  // 선택된 옵션들의 색상을 혼합하여 최종 색상 계산
  const calculateMixedColor = (selectedOptions) => {
    if (selectedOptions.length === 0) return [0.8, 0.8, 0.8]; // 기본 회색
    
    let mixedColor = [0, 0, 0];
    selectedOptions.forEach(optionIndex => {
      const color = psychologicalColors[optionIndex];
      mixedColor[0] += color[0];
      mixedColor[1] += color[1]; 
      mixedColor[2] += color[2];
    });
    
    // 평균내기
    const count = selectedOptions.length;
    return [
      mixedColor[0] / count,
      mixedColor[1] / count,
      mixedColor[2] / count
    ];
  };

  // 현재 선택된 색상 계산
  const currentMixedColor = calculateMixedColor(selectedOptions);

  useEffect(() => {
    if (typeof window !== 'undefined' && canvasRef.current && (currentPage === 0 || currentPage === 1)) {
      const canvas = canvasRef.current;
      let resolution = 0.5;
      let dpr = Math.max(1, resolution * window.devicePixelRatio);
      let frm, renderer, pointers;

      // Initialize renderer and pointer handler
      renderer = new Renderer(canvas, dpr);
      pointers = new PointerHandler(canvas, dpr);
      
      const fragmentShader = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec2 move;
#define FC gl_FragCoord.xy
#define R resolution
#define T time
#define N normalize
#define S smoothstep
#define MN min(R.x,R.y)
#define rot(a) mat2(cos((a)-vec4(0,11,33,0)))
#define csqr(a) vec2(a.x*a.x-a.y*a.y,2.*a.x*a.y)
float rnd(vec3 p) {
  p=fract(p*vec3(12.9898,78.233,156.34));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y*p.z);
}
float swirls(in vec3 p) {
  float d=.0;
  vec3 c=p;
  for(float i=min(.0,time); i<9.; i++) {
    p=.7*abs(p)/dot(p,p)-.7;
    p.yz=csqr(p.yz);
    p=p.zxy;
    d+=exp(-19.*abs(dot(p,c)));
  }
  return d;
}
vec3 march(in vec3 p, vec3 rd) {
  float d=.2, t=.0, c=.0, k=mix(.9,1.,rnd(rd)),
  maxd=length(p)-1.;
  vec3 col=vec3(0);
  for(float i=min(.0,time); i<120.; i++) {
    t+=d*exp(-2.*c)*k;
    c=swirls(p+rd*t);
    if (t<5e-2 || t>maxd) break;
    col+=vec3(c*c,c/1.05,c)*8e-3;
  }
  return col;
}
float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
vec3 sky(vec2 p, bool anim) {
  p.x-=.17-(anim?2e-4*T:.0);
  p*=500.;
  vec2 id=floor(p), gv=fract(p)-.5;
  float n=rnd(id), d=length(gv);
  if (n<.975) return vec3(0);
  return vec3(S(3e-2*n,1e-3*n,d*d));
}
void cam(inout vec3 p) {
  p.yz*=rot(move.y*6.3/MN-T*.05);
  p.xz*=rot(-move.x*6.3/MN+T*.025);
}
void main() {
  vec2 uv=(FC-.5*R)/MN;
  vec3 col=vec3(0),
  p=vec3(0,0,-16),
  rd=N(vec3(uv,1)), rdd=rd;
  cam(p); cam(rd);
  col=march(p,rd);
  col=S(-.2,.9,col);
  vec2 sn=.5+vec2(atan(rdd.x,rdd.z),atan(length(rdd.xz),rdd.y))/6.28318;
  col=max(col,vec3(sky(sn,true)+sky(2.+sn*2.,true)));
  float t=min((time-.5)*.3,1.);
  uv=FC/R*2.-1.;
  uv*=.7;
  float v=pow(dot(uv,uv),1.8);
  col=mix(col,vec3(0),v);
  col=mix(vec3(0),col,t);
  
  // Make background transparent - only show the effect
  float intensity = length(col);
  float alpha = intensity > 0.1 ? 0.7 : 0.0;
  O=vec4(col, alpha);
}`;

      renderer.setup();
      renderer.init();
      renderer.updateShader(fragmentShader);

      const resize = () => {
        const { innerWidth: width, innerHeight: height } = window;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        if (renderer) {
          renderer.updateScale(dpr);
        }
      };

      const loop = (now) => {
        renderer.updateMouse(pointers.first);
        renderer.updatePointerCount(pointers.count);
        renderer.updatePointerCoords(pointers.coords);
        renderer.updateMove(pointers.move);
        renderer.render(now);
        frm = requestAnimationFrame(loop);
      };

      resize();
      window.addEventListener('resize', resize);
      loop(0);

      return () => {
        cancelAnimationFrame(frm);
        window.removeEventListener('resize', resize);
      };
    }
  }, [currentPage]);

  const handleNext = () => {
    if (currentPage === 3) {
      setCurrentPage(0); // Return to main page
      setSelectedOptions([]); // Reset selections
    } else {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleOptionClick = (optionIndex) => {
    setSelectedOptions(prev => {
      if (prev.includes(optionIndex)) {
        return prev.filter(index => index !== optionIndex);
      } else {
        return [...prev, optionIndex];
      }
    });
  };

  const getPageTitle = () => {
    if (currentPage === 0) return "메인 페이지";
    return `페이지 ${currentPage}`;
  };

  const getBackgroundImage = () => {
    if (currentPage === 0) return "/메인.png";
    return "/페이지.png";
  };

  return (
    <>
      <Head>
        <title>{getPageTitle()}</title>
        <meta name="description" content={getPageTitle()} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Background Image */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        backgroundColor: 'black'
      }}>
        <Image
          src={getBackgroundImage()}
          alt={getPageTitle()}
          fill
          style={{
            objectFit: 'contain',
            objectPosition: 'center'
          }}
          priority
        />
      </div>

      {/* Dark Overlay for non-main pages */}
      {currentPage > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 0
        }} />
      )}

      {/* Aurora Effect for Page 2 (third page) */}
      {currentPage === 2 && <AuroraEffect />}

      {/* Color Mix Effect for Page 3 (fourth page) */}
      {currentPage === 3 && <ColorMixEffect selectedColor={currentMixedColor} />}

      {/* Shader Overlay - show on main page and second page with different opacity */}
      {(currentPage === 0 || currentPage === 1) && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'auto',
            mixBlendMode: 'screen',
            zIndex: 1,
            opacity: currentPage === 0 ? 1 : 0.3
          }}
        />
      )}

      {/* Content for Page 1 */}
      {currentPage === 1 && (
        <div style={{
          position: 'relative',
          zIndex: 2,
          padding: 'clamp(1.7411rem, 1.3216rem + 2.0978vw, 2.9473rem)',
          paddingTop: 'clamp(3rem, 2rem + 4vw, 6rem)',
          fontFamily: '"Newsreader", "Gowun Batang", serif',
          fontSize: 'clamp(1rem, 0.9565rem + 0.2174vw, 1.125rem)',
          lineHeight: '1.4',
          color: 'rgba(255, 255, 255, 0.9)',
          maxWidth: '100vw',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start'
        }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 1.3914rem + 3.043vw, 3.7497rem)',
            fontWeight: 'normal',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '2rem',
            textWrap: 'balance',
            fontFamily: '"Newsreader", serif'
          }}>
            <em style={{ color: 'rgba(255, 255, 255, 0.9)' }}>VAYA</em>, your <em style={{ color: 'rgba(255, 255, 255, 0.9)' }}>scent</em>
          </h1>
          
          <div style={{
            maxWidth: '34em',
            marginBottom: '3rem'
          }}>
            <p style={{ 
              marginBottom: '1.5rem',
              fontFamily: '"Newsreader", serif'
            }}>
              VAYA is a living incense that listens to your unconscious and offers words of comfort. Born and existing solely to soothe you, each VAYA lives, breathes, and eventually dies for that purpose. Through a deep connection with your inner self, VAYA creates a unique scent and color that reflect your soul. When your life comes to an end, the fragrance left behind by VAYA remains in the world—offering comfort to your loved ones and keeping your memory alive.
            </p>
            <p style={{ 
              marginBottom: '3rem', 
              fontSize: '1.1em', 
              fontStyle: 'italic',
              fontFamily: '"Newsreader", serif'
            }}>
              Create your own scent with VAYA.
            </p>
            
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '2rem' }}>
              <p style={{ 
                marginBottom: '1.5rem',
                fontFamily: '"Gowun Batang", serif'
              }}>
                VAYA는 당신의 무의식을 분석하여 위로의 말을 건네는 생명을 가진 인센스입니다. 이들은 당신을 위로하기 위해 탄생하고 살아가며 죽습니다. VAYA는 생명을 바쳐 들여다본 당신의 무의식을 통해 당신만의 향기와 색을 창조합니다. 이렇게 만들어진 향은 당신의 생명이 다하는 순간, 당신 대신 이 세상에 남겨져 소중한 사람들을 위로하고 당신을 기억하게 합니다.
              </p>
              <p style={{ 
                fontSize: '1.1em', 
                fontStyle: 'italic',
                fontFamily: '"Gowun Batang", serif'
              }}>
                VAYA와 함께 당신만의 향을 만들어보세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content for Page 2 */}
      {currentPage === 2 && (
        <div style={{
          position: 'relative',
          zIndex: 2,
          padding: 'clamp(1.7411rem, 1.3216rem + 2.0978vw, 2.9473rem)',
          paddingTop: 'clamp(3rem, 2rem + 4vw, 6rem)',
          fontFamily: '"Newsreader", "Gowun Batang", serif',
          fontSize: 'clamp(1rem, 0.9565rem + 0.2174vw, 1.125rem)',
          lineHeight: '1.4',
          color: 'rgba(255, 255, 255, 0.9)',
          maxWidth: '100vw',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6rem',
            alignItems: 'start',
            width: '100%',
            maxWidth: '1400px'
          }}>
            {/* Left Side - Title and Description */}
            <div>
              <h1 style={{
                fontSize: 'clamp(2rem, 1.3914rem + 3.043vw, 3.7497rem)',
                fontWeight: 'normal',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '2rem',
                textWrap: 'balance',
                lineHeight: '1.2',
                fontFamily: '"Newsreader", serif'
              }}>
                What are your<br />
                <em style={{ color: 'rgba(255, 255, 255, 0.9)' }}>psychological</em> results?
              </h1>
              
              <p style={{ 
                marginBottom: '4rem',
                textWrap: 'pretty',
                lineHeight: '1.6',
                fontFamily: '"Gowun Batang", serif',
                maxWidth: '25em'
              }}>
                책자를 통해 파악한 당신의 무의식은 무엇이었나요?<br />
                해당하는 것을 모두 고르고 당신만의 향을 조색하세요.
              </p>
            </div>

            {/* Right Side - Selection Options */}
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem',
              paddingTop: '12rem',
              marginLeft: '-6rem',
              justifySelf: 'start'
            }}>
              {psychologicalOptions.map((option, index) => (
                <div 
                  key={index}
                  onClick={() => handleOptionClick(index)}
                  style={{
                    padding: '1.8rem 2rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    borderLeft: selectedOptions.includes(index) ? '8px solid rgba(255, 255, 255, 0.9)' : '8px solid transparent',
                    opacity: selectedOptions.length > 0 && !selectedOptions.includes(index) ? 0.4 : 1,
                    fontWeight: selectedOptions.includes(index) ? '700' : '400',
                    color: selectedOptions.includes(index) ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.9)',
                    fontSize: 'clamp(1.1rem, 1rem + 0.3vw, 1.3rem)',
                    backgroundColor: selectedOptions.includes(index) ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    borderRadius: '4px',
                    fontFamily: '"Gowun Batang", serif',
                    minWidth: '35rem',
                    width: '35rem'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedOptions.length === 0) {
                      // 아직 선택한 것이 없을 때
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 1)';
                    } else if (!selectedOptions.includes(index)) {
                      // 다른 것을 선택했지만 이것은 선택되지 않았을 때
                      e.currentTarget.style.opacity = '0.7';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedOptions.length === 0) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                    } else if (!selectedOptions.includes(index)) {
                      e.currentTarget.style.opacity = '0.4';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {index + 1}. {option}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content for Page 3 - Color Result */}
      {currentPage === 3 && (
        <div style={{
          position: 'relative',
          zIndex: 2,
          padding: 'clamp(1.7411rem, 1.3216rem + 2.0978vw, 2.9473rem)',
          paddingTop: 'clamp(3rem, 2rem + 4vw, 6rem)',
          fontFamily: '"Newsreader", "Gowun Batang", serif',
          fontSize: 'clamp(1rem, 0.9565rem + 0.2174vw, 1.125rem)',
          lineHeight: '1.4',
          color: 'rgba(255, 255, 255, 0.9)',
          maxWidth: '100vw',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start'
        }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 1.3914rem + 3.043vw, 3.7497rem)',
            fontWeight: 'normal',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '2rem',
            textWrap: 'balance',
            lineHeight: '1.2',
            fontFamily: '"Newsreader", serif'
          }}>
            Your <em style={{ color: 'rgba(255, 255, 255, 0.9)' }}>personal</em> scent
          </h1>
          
          <div style={{
            maxWidth: '34em',
            marginBottom: '3rem'
          }}>
            <p style={{ 
              marginBottom: '2rem',
              textWrap: 'pretty',
              lineHeight: '1.6',
              fontFamily: '"Newsreader", serif'
            }}>
              Based on your psychological results, VAYA has created a unique scent that reflects your inner self.
            </p>
            
            {selectedOptions.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ 
                  fontSize: '1.2em', 
                  marginBottom: '1rem',
                  fontFamily: '"Gowun Batang", serif',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  당신이 선택한 감정들:
                </h3>
                <ul style={{ 
                  listStyle: 'none', 
                  padding: 0,
                  fontFamily: '"Gowun Batang", serif'
                }}>
                  {selectedOptions.map(optionIndex => (
                    <li key={optionIndex} style={{
                      marginBottom: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      borderLeft: `4px solid rgb(${Math.round(psychologicalColors[optionIndex][0] * 255)}, ${Math.round(psychologicalColors[optionIndex][1] * 255)}, ${Math.round(psychologicalColors[optionIndex][2] * 255)})`
                    }}>
                      {optionIndex + 1}. {psychologicalOptions[optionIndex]}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <p style={{ 
              fontSize: '1.1em', 
              fontStyle: 'italic',
              fontFamily: '"Newsreader", serif',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              Watch as your emotions blend into a beautiful, living fragrance that is uniquely yours.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Component */}
      <Navigation onNext={handleNext} currentPage={currentPage} />
    </>
  );
}
