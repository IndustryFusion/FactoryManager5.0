import { useRouter } from "next/router";
import FactoryEdit from "./factories/edit-form";

const factoryEdit = () => {
    const router = useRouter();
    const { factoryId } = router.query;
    console.log('factoryId ',factoryId);
    return (
        <FactoryEdit
            factory={factoryId}
            onSave={() => {
                console.log('inside on-submit');
                router.push('/factory-site/factory-overview');
            }}
        />
    )
}

export default factoryEdit;