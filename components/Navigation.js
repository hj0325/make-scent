import Image from "next/image";

export default function Navigation({ onNext, currentPage = 0 }) {
  
  const handleClick = () => {
    if (onNext) {
      onNext();
    }
  };

  const getButtonText = () => {
    if (currentPage === 0) return "Start";
    if (currentPage === 3) return "Return";
    return "Next";
  };

  return (
    <div 
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '0px',
        cursor: 'pointer',
        zIndex: 10,
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span 
        style={{
          color: 'white',
          fontSize: '60px',
          fontWeight: '600',
          textShadow: '4px 4px 8px rgba(0,0,0,0.8)',
          fontFamily: '"Newsreader", serif',
          letterSpacing: '3px'
        }}
      >
        {getButtonText()}
      </span>
      <div style={{ width: '200px', height: '200px', position: 'relative' }}>
        <Image
          src="/문양.png"
          alt="문양"
          fill
          style={{
            objectFit: 'contain',
            filter: 'drop-shadow(4px 4px 8px rgba(0,0,0,0.5))'
          }}
        />
      </div>
    </div>
  );
} 