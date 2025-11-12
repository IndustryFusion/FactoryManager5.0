import { copyToClipboard } from "@/utility/text-format";
import Image from "next/image";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { RefObject } from "react";
import "../../styles/copy-ifric-id.css";
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { OverlayPanel } from "primereact/overlaypanel";
import { ContextMenu } from 'primereact/contextmenu';
import { useRef, useState } from "react";
import { useTranslation } from "next-i18next";

interface IfricIdBadgeProps{
    ifricId: string;
    toast: RefObject<Toast>;
    setShowBlocker: React.Dispatch<React.SetStateAction<boolean>>;
    editOnboardBodyTemplate: () => void;
}
export default function IfricIdBadge({ ifricId, toast, setShowBlocker, editOnboardBodyTemplate }: IfricIdBadgeProps) {

    const [showDropdown, setShowDropdown] = useState(false);
    const op = useRef<OverlayPanel>(null);
    const {t} = useTranslation("dashboard")

    const trimIfricId = (id: string) => {
        if (!id) return null;

        const prefix = 'urn:ifric:ifx-';
        const suffix = id.slice(-8);

        return `${prefix}....${suffix}`;
    };


    const menuModel = [
    {
      label: t("onboard"),
      command: () => {
        setShowBlocker(true);
      },
    },
    {
      label: t("edit_onboard"),
      command: () => {
        editOnboardBodyTemplate();
       },
    }
  ];

    return (
        <div className="flex gap-3 justify-content-end">
            <Button type="button" className="global-button company_ifric_id_badge" onClick={() => copyToClipboard(ifricId, toast || "")}>
                <Image width={16} height={16} src='/dashboard-collapse/company_id_icon.svg' alt='company ifric id' />
                <div>{trimIfricId(ifricId)}</div>
                <Image width={16} height={16} src='/dashboard-collapse/company_id_copy_icon.svg' alt='company ifric id' />
            </Button>
            <div className="flex gap-3">
                <Button type="button" className="global-button menu_badge" onClick={(e) => op?.current?.show(e)}>
                    <Image width={16} height={16} src='/context-menu-black.svg' alt='context menu' />
                </Button>
                <ContextMenu
                    model={menuModel}
                    ref={op}
                />
            </div>
            
        </div>
        
    )
}