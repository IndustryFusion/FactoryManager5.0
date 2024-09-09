const FactoryCard =()=>{
    return(
        <>
        <div className="factory-card">
         <div className="flex justify-content-between">
            <div className="flex factory-card-head">
             <div className="factory-img">

             </div>
             <div>
              <p className="factory-name">Factory 1</p>
              <p className="factory-location">Plasmaschneidanlage</p>
             </div>
            </div>
            <div>
            <img src="/context-menu.png" alt="context-menu-icon" />
            </div>
         </div>
          <div className="flex gap-1">
            <div className="factory-card-progressbar"></div>
            <div className="factory-card-content">
                <h2 className="m-0 asset-values">1.134</h2>
                <p className="m-0 assets-text">Assets</p>

                <div className="card-text-container">
                    <div className="flex gap-2">
                        <img src="/passport.jpg" alt="passport" />
                        <p
                        className="m-0 card-text"
                        ><span
                        className="pass-value"
                        >1.125</span> Product Passes 
                        <span className="pass-percent"> (85.4%)</span></p>
                    </div>
                    <div className="flex gap-2 mt-2">
                    <img src="/copy.jpg" alt="copy" />
                    <p
                        className="m-0 card-text"
                        ><span
                        className="twin-value"
                        >681</span> Digital Twins 
                        <span className="twin-percent"> (56.8%)</span></p>
                    </div>
                </div>
            </div>
          </div>
        </div>
        </>
    )
}
export default FactoryCard;