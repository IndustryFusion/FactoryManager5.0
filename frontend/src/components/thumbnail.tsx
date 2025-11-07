// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import { Button } from "primereact/button";
import { FileUpload } from "primereact/fileupload";
import { ProgressBar } from "primereact/progressbar";
import { Tag } from "primereact/tag";
import { Tooltip } from "primereact/tooltip";
import "@/styles/factory-form.css"
import { useEffect, useState } from "react";
import { useTranslation } from "next-i18next";

interface HeaderTemplateOptions {
    className: string;
    chooseButton: JSX.Element;
    uploadButton: JSX.Element;
    cancelButton: JSX.Element;
}
interface ButtonOptions {
    icon: string;
    iconOnly: boolean;
    className: string;
}
interface ThumbnailProps {
    keyProp: string;
    fileUploadKeyProp: number;
    handleFileUploadProp: (e: { files: File[] }) => Promise<void>;
    setUploadedFileNameProp: React.Dispatch<React.SetStateAction<string>>;
    uploadingProp: boolean;
    uploadedFileNameProp: string;
    isEditProp?: boolean;
    fileProp?: string;
    setIsEditProp?: React.Dispatch<React.SetStateAction<boolean>> | undefined;
    setSubmitDisabledProp: React.Dispatch<React.SetStateAction<boolean>>;
}


const Thumbnail: React.FC<ThumbnailProps> = (
    {
        keyProp,
        fileUploadKeyProp,
        handleFileUploadProp,
        setUploadedFileNameProp,
        uploadingProp,
        uploadedFileNameProp,
        isEditProp,
        setIsEditProp,
        fileProp,
        setSubmitDisabledProp
    }

) => {
    const { t } = useTranslation('reactflow');
    const [fileName, setFileName] = useState(fileProp)


    useEffect(() => {
        setFileName(fileProp);
    }, [fileProp]);
    
    let value = fileName;
    if (value && (typeof value == 'string') && (value.includes('png') || value.includes('jpg') || value.includes('jpeg') || value.includes('.pdf'))) {
      value = value.split('/').pop();
    }
   

    const headerTemplate = (options: HeaderTemplateOptions) => {
        const { className, chooseButton, uploadButton, cancelButton } = options;
        return (
            <div className={className} style={{ backgroundColor: 'transparent', display: 'flex', alignItems: 'center' }}>
                {chooseButton}
                {uploadButton}
                {cancelButton}

            </div>
        )
    };

    const onTemplateRemove = (callback: () => void) => {
        callback();
        setUploadedFileNameProp("");
    };

    const itemTemplate = (file: any, props: any) => {
        if (setIsEditProp) {
            setIsEditProp(false);
        }
        if(file){
           setSubmitDisabledProp(true);
           if(file && uploadedFileNameProp !== ""){
            setSubmitDisabledProp(false);
        }
        }
        return (
            <div>

            
            <div className="flex align-items-center flex-wrap">
                <div className="flex align-items-center" style={{ width: '70%' }}>
                    <img alt={file.name} role="presentation" src={file.objectURL} width={100} />
                    <span className="flex flex-column text-left ml-3">
                        {file.name}
                        <small>{new Date().toLocaleDateString()}</small>
                    </span>
                </div>
                <Tag value={props.formatSize} severity="warning" className="px-3 py-2" />
                <Button type="button" icon="pi pi-times" className="p-button-outlined p-button-rounded p-button-danger ml-auto"
                    onClick={() => {
                        onTemplateRemove(props.onRemove)
                        setSubmitDisabledProp(false)
                    }
                       
                    }
                />
               
            </div>
            {uploadedFileNameProp === "" && <p className="input-invalid-text">{t('reactflow:uploadImageBeforeSubmit')}</p> }
            
            </div>
        );
    };

   

    const emptyTemplate = () => {
        return (
            <div className="flex align-items-center flex-column">
                <img 
                    src={'https://iff-dev.s3-eu-central-1.ionoscloud.com/file-1708002371615-146731380.png'}  
                    className="factory-image mt-4 border-round" 
                    style={{height:"60px", width:"60px"}}
                />
                <span style={{ fontSize: '12px',fontWeight:"bold", fontFamily: "Comic Sans MS",color: 'var(--text-color-secondary)' }} className="my-3">
                    {t('reactflow:dragAndDropImageHere')}
                </span>
            </div>
        );
    };
    
    const chooseOptions: ButtonOptions = { icon: 'pi pi-fw pi-images', iconOnly: true, className: 'custom-choose-btn p-button-rounded p-button-outlined' };
    const uploadOptions: ButtonOptions = { icon: 'pi pi-fw pi-cloud-upload', iconOnly: true, className: 'custom-upload-btn p-button-success p-button-rounded p-button-outlined' };
    const cancelOptions: ButtonOptions = { icon: 'pi pi-fw pi-times', iconOnly: true, className: 'custom-cancel-btn p-button-danger p-button-rounded p-button-outlined' };


    return (
        <>
            <Tooltip target=".custom-choose-btn" content={t('reactflow:browse')} position="bottom" />
            <Tooltip target=".custom-upload-btn" content={t('reactflow:upload')} position="bottom" />
            <Tooltip target=".custom-cancel-btn" content={t('reactflow:clear')} position="bottom" />
            <FileUpload
                id="file"
                key={fileUploadKeyProp}
                name={keyProp}
                url="/file"
                multiple={false}
                customUpload={true}
                accept="image/*"
                maxFileSize={1000000}
                uploadHandler={handleFileUploadProp}
                headerTemplate={headerTemplate} itemTemplate={ itemTemplate}
                emptyTemplate={!fileName && emptyTemplate}
                chooseOptions={chooseOptions} uploadOptions={uploadOptions} cancelOptions={cancelOptions}
                onClear={() => {
                    setUploadedFileNameProp("");
                    setSubmitDisabledProp(false)
                }}
            />
            {isEditProp && setIsEditProp && fileName ? 
             <div className=" align-items-center flex-wrap edit-thumbnail-container" style={{display: isEditProp? "flex": "none" }}>
             <div className="flex align-items-center" style={{ width: '70%' }}>
                 <img alt={fileName} className="edit-thumbnail-image" role="presentation" src={fileName} width={100} />
                 
                 <span className="flex flex-column text-left ml-3">
                     {value}
                 </span>
                 </div>
                 <Button type="button" icon="pi pi-times" className="p-button-outlined p-button-rounded p-button-danger ml-auto"                
                     onClick={
                      ()=> {
                        setIsEditProp(false) 
                        setFileName("")
                      }
                     }
                 />
             
             </div> 
             : null
            }
         
            {uploadingProp && (
                <ProgressBar mode="indeterminate" style={{ marginTop: "2rem", height: '6px' }} />
            )}
            {!uploadingProp && uploadedFileNameProp.length > 0 ? (
                <p className="p-2">{t('reactflow:uploadedFile')} {uploadedFileNameProp}</p>
            ) : null}
        </>
    )
}

export default Thumbnail;