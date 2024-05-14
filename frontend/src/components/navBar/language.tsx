import "../../app/flag.css";
import React, { useEffect, useState } from "react";
import { Dropdown } from 'primereact/dropdown';
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/state/store";
import { create, reset } from "@/state/language/languageSlice";
interface localeObject {
    name: string;
    code: string;
}
const Language: React.FC = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const languageRedux = useSelector((state: RootState) => state.language);
    const [selectedLanguage, setSelectedLanguage] = useState<{ name: string; code: string } | null>(null);
    const countries = [
        { name: 'English', code: 'UK' },
        { name: 'German', code: 'DE' }
    ];
    useEffect(()=> {
        if(languageRedux.name.length > 0){
            setSelectedLanguage(languageRedux);
        }
    },[languageRedux])
    
    const changeLocale = (newLocale: any) => {
        setSelectedLanguage(newLocale);
        const { pathname, asPath, query } = router;
        router.push({ pathname, query }, asPath, { locale: newLocale.code == 'UK' ? 'en' : newLocale.code.toLowerCase() });
        dispatch(create({
            name: newLocale.name,
            code: newLocale.code
        }));
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
        <Dropdown value={selectedLanguage} onChange={(e) => changeLocale(e.value)} options={countries} optionLabel="name" placeholder="Select a Language" 
            filter valueTemplate={selectedLanguageTemplate} itemTemplate={languageOptionTemplate} className="w-full md:w-14rem" />
    )
};

export default Language;
