import { Button } from "primereact/button";
import { FileUpload } from "primereact/fileupload";
import { ProgressBar } from "primereact/progressbar";
import { Tag } from "primereact/tag";
import { Tooltip } from "primereact/tooltip";
import { useState } from "react";

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
}


const Thumbnail: React.FC<ThumbnailProps> = (
    {
        keyProp,
        fileUploadKeyProp,
        handleFileUploadProp,
        setUploadedFileNameProp,
        uploadingProp,
        uploadedFileNameProp,
    }

) => {


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
        return (
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
                    onClick={() => onTemplateRemove(props.onRemove)}
                />
            </div>
        );
    };

    const emptyTemplate = () => {
        return (
            <div className="flex align-items-center flex-column">
                <i className="pi pi-image mt-3 p-5" style={{ fontSize: '5em', borderRadius: '50%', backgroundColor: 'var(--surface-b)', color: 'var(--surface-d)' }}></i>
                <span style={{ fontSize: '1.2em', color: 'var(--text-color-secondary)' }} className="my-5">
                    Drag and Drop Image Here
                </span>
            </div>
        );
    };
    
    const chooseOptions: ButtonOptions = { icon: 'pi pi-fw pi-images', iconOnly: true, className: 'custom-choose-btn p-button-rounded p-button-outlined' };
    const uploadOptions: ButtonOptions = { icon: 'pi pi-fw pi-cloud-upload', iconOnly: true, className: 'custom-upload-btn p-button-success p-button-rounded p-button-outlined' };
    const cancelOptions: ButtonOptions = { icon: 'pi pi-fw pi-times', iconOnly: true, className: 'custom-cancel-btn p-button-danger p-button-rounded p-button-outlined' };


    return (
        <>
            <Tooltip target=".custom-choose-btn" content="Browse" position="bottom" />
            <Tooltip target=".custom-upload-btn" content="Upload" position="bottom" />
            <Tooltip target=".custom-cancel-btn" content="Clear" position="bottom" />
            <FileUpload
                id="file"
                key={fileUploadKeyProp}
                name={keyProp}
                url="/file"
                multiple={false}
                customUpload={true}
                accept="image/*"
                uploadHandler={handleFileUploadProp}
                headerTemplate={headerTemplate} itemTemplate={itemTemplate}
                emptyTemplate={emptyTemplate}
                chooseOptions={chooseOptions} uploadOptions={uploadOptions} cancelOptions={cancelOptions}
                onClear={() => setUploadedFileNameProp("")}
            />
            {uploadingProp && (
                <ProgressBar mode="indeterminate" style={{ marginTop: "2rem", height: '6px' }} />
            )}
            {!uploadingProp && uploadedFileNameProp.length > 0 ? (
                <p className="p-2">Uploaded File: {uploadedFileNameProp}</p>
            ) : null}
        </>
    )
}

export default Thumbnail;