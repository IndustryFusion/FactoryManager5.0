import { copyToClipboard } from "@/utility/text-format";
import Image from "next/image";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { RefObject } from "react";
import "../../styles/copy-ifric-id.css"

interface IfricIdBadgeProps{
    ifricId: string;
    toast: RefObject<Toast>;
}
export default function IfricIdBadge({ ifricId, toast }: IfricIdBadgeProps) {

    const trimIfricId = (id: string) => {
        if (!id) return null;

        const prefix = 'urn:ifric:ifx-';
        const suffix = id.slice(-8);

        return `${prefix}........${suffix}`;
    };

    return (
        <Button type="button" className="global-button company_ifric_id_badge" onClick={() => copyToClipboard(ifricId, toast || "")}>
            <Image width={16} height={16} src='/dashboard-collapse/company_id_icon.svg' alt='company ifric id' />
            <div>{trimIfricId(ifricId)}</div>
            <Image width={16} height={16} src='/dashboard-collapse/company_id_copy_icon.svg' alt='company ifric id' />
        </Button>
    )
}