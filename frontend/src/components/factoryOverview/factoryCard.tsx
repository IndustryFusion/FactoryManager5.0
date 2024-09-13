import { useRef, useState } from "react";
import "../../styles/progressbar.css";
import { ContextMenu } from "primereact/contextmenu";

const FactoryCard:React.FC<any> = ({menuModel}) => {
  const [showContextMenu, setShowContextMenu] = useState(true);
  const cm = useRef(null);

  const handleClick = (event:any) => {
    event.preventDefault(); 
    cm.current.show(event); 
};

  return (
    <>
    {showContextMenu && 
                <ContextMenu
                model={menuModel}
                ref={cm}
                //onHide={() => setSelectedProduct(null)}
              />
      }
      <div className="factory-card">
        <div className="flex justify-content-between">
          <div className="flex factory-card-head">
            <div className="factory-img"></div>
            <div>
              <p className="factory-name">Factory 1</p>
              <p className="factory-location">Plasmaschneidanlage</p>
            </div>
          </div>
          <div>
		   <button
			className="context-menu-icon-btn "
			onClick={handleClick}>
            <img src="/context-menu.png" alt="context-menu-icon" />
		   </button>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="factory-card-progressbar">
            <div id="leftSidebarAssistant">
              <p className="progressbar-value">1.134</p>
              {/* <svg id="leftSidebarAssistantOuterCircle" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 34 34">
    <circle cx="16" cy="16" r="15.9155" className="progress-bar__background" />
    <circle cx="16" cy="16" r="15.9155" className="progress-bar__progress js-progress-bar" />
  </svg> */}
              <svg
                id="leftSidebarAssistantOuterCircle"
                xmlns="http://www.w3.org/2000/svg"
                width="106"
                height="107"
                viewBox="0 0 106 107"
                fill="none"
              >
                <path
                  d="M106 53.6401C106 82.9112 82.2711 106.64 53 106.64C23.7289 106.64 0 82.9112 0 53.6401C0 24.369 23.7289 0.640137 53 0.640137C82.2711 0.640137 106 24.369 106 53.6401ZM10.6 53.6401C10.6 77.057 29.5831 96.0401 53 96.0401C76.4169 96.0401 95.4 77.057 95.4 53.6401C95.4 30.2233 76.4169 11.2401 53 11.2401C29.5831 11.2401 10.6 30.2233 10.6 53.6401Z"
                  fill="#F3F3F5"
                />
                <path
                  opacity="0.8"
                  d="M53 0.640137C65.3333 0.640137 77.2805 4.94139 86.7835 12.8029C96.2865 20.6645 102.75 31.5941 105.061 43.7089C107.372 55.8238 105.386 68.3653 99.4443 79.1731C93.5026 89.9809 83.9778 98.3781 72.5106 102.918L68.6085 93.0627C77.7822 89.4305 85.4021 82.7127 90.1554 74.0665C94.9087 65.4203 96.4978 55.3871 94.649 45.6952C92.8002 36.0033 87.6292 27.2596 80.0268 20.9704C72.4244 14.6811 62.8666 11.2401 53 11.2401V0.640137Z"
                  fill="#FCA82B"
                />
              </svg>
              <svg
                id="leftSidebarAssistantInnerCircle"
                xmlns="http://www.w3.org/2000/svg"
                width="76"
                height="75"
                viewBox="0 0 76 75"
                fill="none"
              >
                <path
                  d="M75.1 37.64C75.1 58.1298 58.4897 74.74 38 74.74C17.5102 74.74 0.899963 58.1298 0.899963 37.64C0.899963 17.1503 17.5102 0.540039 38 0.540039C58.4897 0.540039 75.1 17.1503 75.1 37.64ZM12.03 37.64C12.03 51.9829 23.6571 63.61 38 63.61C52.3428 63.61 63.97 51.9829 63.97 37.64C63.97 23.2972 52.3428 11.67 38 11.67C23.6571 11.67 12.03 23.2972 12.03 37.64Z"
                  fill="#F3F3F5"
                />
                <path
                  d="M38 0.540039C45.0401 0.540039 51.9349 2.54317 57.8791 6.31547C63.8233 10.0878 68.5715 15.4735 71.569 21.8436C74.5666 28.2137 75.6898 35.3053 74.8074 42.2899C73.925 49.2745 71.0736 55.8639 66.586 61.2885L58.0102 54.1939C61.1515 50.3968 63.1475 45.7842 63.7652 40.8949C64.3828 36.0057 63.5966 31.0416 61.4983 26.5826C59.4 22.1235 56.0763 18.3535 51.9154 15.7128C47.7544 13.0722 42.9281 11.67 38 11.67V0.540039Z"
                  fill="#478FB7"
                />
              </svg>
              {/* <svg id="leftSidebarAssistantInnerCircle" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 34 34">
    <circle cx="16" cy="16" r="15.9155" className="progress-bar__background" />
    <circle cx="16" cy="16" r="15.9155" className="progress-bar__progress js-progress-bar" />
  </svg> */}
            </div>
          </div>
          <div className="factory-card-content mt-4">
            <h2 className="m-0 asset-values">1.134</h2>
            <p className="m-0 assets-text">Assets</p>

            <div className="card-text-container">
              <div className="flex gap-2">
                <img src="/passport.jpg" alt="passport" />
                <p className="m-0 card-text">
                  <span className="pass-value">1.125</span> Product Passes
                  <span className="pass-percent"> (85.4%)</span>
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <img src="/copy.jpg" alt="copy" />
                <p className="m-0 card-text">
                  <span className="twin-value">681</span> Digital Twins
                  <span className="twin-percent"> (56.8%)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default FactoryCard;
