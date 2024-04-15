import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import "../styles/factory-shopfloor.css"

const FactoryShopFloorForm = () => {
    return (
        <Card className="px-5 " style={{height:"90vh"}}>        
            <form>
                <h1></h1>
                <div className="input-container gap-6">
                    <label htmlFor="">ShopFloor</label>
                    <InputText
                    className="input-content"
                        placeholder=""
                    />
                </div>
                <div className="input-container" style={{gap: "5.2rem"}} >
                    <label htmlFor="">Asset</label>
                    <InputText
                    className="input-content"
                        placeholder=""
                    />
                </div>
                <div className="mt-4">
                    <p style={{fontWeight:"bold"}}>Relations</p>
                    <div className="input-container" style={{gap: "3.7rem"}}>
                        <label htmlFor="">HasFilter</label>
                        <InputText
                        className="input-content"
                            placeholder=""
                        />
                    </div>
                    <div className="input-container" style={{gap: "2.9rem"}}>
                        <label htmlFor="">HasSource</label>
                        <InputText
                        className="input-content"
                            placeholder=""
                        />
                    </div>
                    <div className="input-container" style={{gap: "2.8rem"}}>
                        <label htmlFor="">HasTracker</label>
                        <InputText
                        className="input-content"
                            placeholder=""
                        />
                    </div>
                    <div className="input-container" style={{gap: "2.2rem"}}>
                        <label htmlFor="">HasCatridge</label>
                        <div className="flex" style={{gap: "1rem",width:"100%"}}>
                        <InputText
                       style={{flex:" 0 50%"}}
                            placeholder=""
                        />
                         <InputText
                         style={{flex:" 0 50%"}}
                            placeholder=""
                        />
                        </div>
                    </div>
                    <div className="input-container" style={{gap: "2.9rem"}}>
                        <label htmlFor="">Workpiece</label>
                        <div className="flex" style={{gap: "1rem",width:"100%"}}>
                        <InputText
                        style={{flex:" 0 50%"}}
                            placeholder=""
                        />
                         <InputText
                         style={{flex:" 0 50%"}}
                            placeholder=""
                        />
                        </div>
                    </div>
                </div>
                <div className="form-btns">
                    <Button
                     severity="secondary" text raised
                     label="Reset"
                     className="mr-2"
                     type="button"
                    ></Button>
                    <Button
                    className="save-btn"
                    >Save</Button>

                </div>
            </form>
        </Card>
    )
}

export default FactoryShopFloorForm;