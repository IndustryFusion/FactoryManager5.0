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
    const { t } = useTranslation(['overview']);

    return (
        <>
            <Dialog
                visible={deleteDialog}
                onHide={() => setDeleteDialog(false)}
                header="Confirm Delete"
            >
                <div className="mb-6">
               {/* // {t('dashboard:productName')} */}
                    <span>{t('overview:deleteWarning')}</span>
                    <span style={{ textTransform: "capitalize", fontWeight: "bold" }}> {deleteItemName}</span>
                </div>



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
                    className="mr-2"
                    onClick={() => setDeleteDialog(false)}
                ></Button>
            </Dialog>
        </>
    )
}

export default DeleteDialog;