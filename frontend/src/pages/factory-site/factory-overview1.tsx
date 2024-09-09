import Sidebar from "@/components/navBar/sidebar";
import "../../styles/factory-overview.css";
import { useState } from "react";
import Footer from "@/components/navBar/footer";
import Navbar from "@/components/navBar/navbar";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import OverviewHeader from "@/components/factoryOverview/overview-header";
import FactoryCard from "@/components/factoryOverview/factoryCard";

const FactoryOverview=()=>{
    const [isSidebarExpand, setSidebarExpand] = useState(true);
    const { t } = useTranslation(['overview', 'placeholder']);
    return(
        <>
         <div className="flex">
        <div className={isSidebarExpand ? "sidebar-container" : "collapse-sidebar"}>
          <Sidebar isOpen={isSidebarExpand} setIsOpen={setSidebarExpand} />
        </div>
        <div className={isSidebarExpand ? "factory-container" : "  factory-container-collpase"} >
          <Navbar navHeader={t('overview:factoryOverview')} />
          <div>
            <OverviewHeader />
          </div>
          <div>
            <FactoryCard />
          </div>
        </div>
        </div>
        <Footer />
        </>
    )
}

export async function getStaticProps({ locale }: { locale: string }) {
    return {
      props: {
        ...(await serverSideTranslations(locale, [
          'header',
          'overview',
          'placeholder',
          'dashboard',
          'button'
        ])),
      },
    }
  }
export default FactoryOverview;