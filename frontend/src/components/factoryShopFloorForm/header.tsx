import { useRouter } from "next/router";
import { InputSwitch } from "primereact/inputswitch";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import "../../styles/factory-shopfloor.css"
import { fetchFactoryDetails, getShopFloorAssets } from "@/utility/factory-site-utility";

const Header =()=>{
    const [switchView, setSwitchView] = useState(false);
    const [factoryName, setFactoryName] = useState("");
    const [factoryIdValue, setfactoryIdvalue] = useState("");
    const router = useRouter();


    const getFactoryDetails = async (factoryId: string) => {
        try {
            const response = await fetchFactoryDetails(factoryId);
            const factoryname = response["http://www.industry-fusion.org/schema#factory_name"]?.value
            setFactoryName(factoryname)
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        if (Cookies.get("login_flag") === "false") {
            router.push("/login");
        } else if (router.isReady) {
            // Use TypeScript's non-null assertion operator to assert that `id` is not undefined
            const id: string = Array.isArray(router.query.factoryId) ? router.query.factoryId[0]! : router.query.factoryId!;
            getFactoryDetails(id);
            setfactoryIdvalue(id);
        }

    }, [router.isReady]);

    return(
        <>
         <div className="flex justify-content-between px-5 factory-header" style={{width:"100%"}}>
                        <h3 className="factory-heading">{factoryName}</h3>
                        <div className=" flex  gap-2 mt-4">
                            <span>Switch View</span>
                            <InputSwitch checked={switchView} onChange={(e) => {
                                setSwitchView(e.value);
                                router.push(`/factory-site/shop-floor/${factoryIdValue}`)
                            }} />
                        </div>

                    </div>
        </>
    )
}

export default Header;