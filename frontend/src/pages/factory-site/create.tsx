import { useRouter } from "next/router";
import FactoryForm from "./factories/factory-form";

const factoryEdit = () => {
    const router = useRouter();
    const { factoryId } = router.query;
    console.log('factoryId ',factoryId);
    return (
        <FactoryForm
            onSave={(data: any) => router.push('/factory-site/factory-overview')}
        />
    )
}

export default factoryEdit;