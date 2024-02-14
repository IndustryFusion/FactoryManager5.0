
import { useEffect, useRef } from 'react';
import "../styles/home-page.css"
import { useRouter } from 'next/router';

const HomePage:React.FC=()=>{
    const containerRef = useRef<HTMLDivElement | null>(null);
    const leftRef = useRef<HTMLDivElement | null>(null);
    const rightRef = useRef<HTMLDivElement | null>(null);
    const router = useRouter();

    const navigateToFleet = () => {
        router.push("/asset/asset-overview");
      };
    
      const navigateToFactoryManager = () => {
        router.push("/factory-manager");
      };
   
    useEffect(() => {
       const container = containerRef.current;
       const left = leftRef.current;
       const right = rightRef.current;
   
       const addHoverClass = (className:string) => {
         if (container) {
           container.classList.add(className);
         }
       };
   
       const removeHoverClass = (className:string) => {
         if (container) {
           container.classList.remove(className);
         }
       };
   
       if(left && right){
        left.addEventListener('mouseenter', () => addHoverClass('hover_left'));
       left.addEventListener('mouseleave', () => removeHoverClass('hover_left'));
       right.addEventListener('mouseenter', () => addHoverClass('hover_right'));
       right.addEventListener('mouseleave', () => removeHoverClass('hover_right'));
   
       // Clean up event listeners on unmount
       return () => {
         left.removeEventListener('mouseenter', () => addHoverClass('hover_left'));
         left.removeEventListener('mouseleave', () => removeHoverClass('hover_left'));
         right.removeEventListener('mouseenter', () => addHoverClass('hover_right'));
         right.removeEventListener('mouseleave', () => removeHoverClass('hover_right'));
       };
       }
       
    }, []);
   

    return(
        <div ref={containerRef} className="container">
        <div ref={leftRef} className="split left">
          <p className="tagline">Efficient Solutions, Enhanced Efficiency</p>
          <button className="btn" onClick={ navigateToFactoryManager}>Factory Manager</button>
        </div>
        <div ref={rightRef} className="split right">
          <p className="tagline">Reliable Services, Unmatched Excellence</p>
          <button  className="btn" onClick={navigateToFleet}>Fleet Manager</button>
        </div>
      </div>   
    )
}

export default HomePage;