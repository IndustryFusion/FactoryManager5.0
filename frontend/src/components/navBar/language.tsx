import "../../app/flag.css";
import React, { useState } from "react";
import { Dropdown } from 'primereact/dropdown';
import { useRouter } from "next/router";

interface localeObject {
    name: string;
    code: string;
}
const Language: React.FC = () => {
    const router = useRouter();
    const [selectedLanugage, setSelectedLanguage] = useState(null);
    const countries = [
        { name: 'English', code: 'UK' },
        { name: 'French', code: 'FR' },
        { name: 'German', code: 'DE' }
    ];

    const changeLocale = (newLocale: any) => {
        setSelectedLanguage(newLocale);
        const { pathname, asPath, query } = router;
        router.push({ pathname, query }, asPath, { locale: newLocale.code == 'UK' ? 'en' : newLocale.code.toLowerCase() });
    }

    const selectedLanguageTemplate = (option: localeObject, props: any) => {
        if (option) {
            return (
                <div className="flex align-items-center">
                    <img alt={option.name} src="https://primefaces.org/cdn/primereact/images/flag/flag_placeholder.png" className={`mr-2 flag flag-${option.code.toLowerCase()}`} style={{ width: '18px' }} />
                    <div>{option.name}</div>
                </div>
            );
        }

        return <span>{props.placeholder}</span>;
    };

    const languageOptionTemplate = (option: localeObject) => {
        return (
            <div className="flex align-items-center">
                <img alt={option.name} src="https://primefaces.org/cdn/primereact/images/flag/flag_placeholder.png" className={`mr-2 flag flag-${option.code.toLowerCase()}`} style={{ width: '18px' }} />
                <div>{option.name}</div>
            </div>
        );
    };

    return (
        // <div className="card flex justify-content-center">
            <Dropdown value={selectedLanugage} onChange={(e) => changeLocale(e.value)} options={countries} optionLabel="name" placeholder="Select a Language" 
                filter valueTemplate={selectedLanguageTemplate} itemTemplate={languageOptionTemplate} className="w-full md:w-14rem" />
        // </div>    
    )
};

export default Language;
