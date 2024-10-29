import { useTranslation } from "next-i18next";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dispatch, SetStateAction } from "react";


interface DeleteDialogProps {
    deleteDialog: boolean;
    setDeleteDialog: Dispatch<SetStateAction<boolean>>;
    handleDelete?: () => void;
    deleteItemName?: string;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ deleteDialog, setDeleteDialog, handleDelete, deleteItemName }) => {
    const { t } = useTranslation('overview'); 
    const header = () => <h3>{t('overview:confirmation')}</h3>
    return (
        <>
            <Dialog
            style={{width:"600px"}}
                visible={deleteDialog}
                onHide={() => setDeleteDialog(false)}
                header={header}
                draggable={false}
                resizable={false}
            >
                <div className="mb-6">
                    <span>Confirm Delete</span>
                    <span style={{ textTransform: "capitalize", fontWeight: "bold" }}> {deleteItemName}</span>
                </div>


                <div className="flex justify-content-end">
                    <Button
                        label={t('yes')}
                        icon="pi pi-check"
                        className="mr-2"
                        onClick={handleDelete}
                    >
                    </Button>
                    <Button
                        label={t('no')}
                        icon="pi pi-times"
                        severity="danger" outlined
                        className="ml-3"
                        onClick={() => setDeleteDialog(false)}
                    ></Button>
                </div>

            </Dialog>
        </>
    )
}

export default DeleteDialog;