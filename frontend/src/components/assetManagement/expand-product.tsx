
import React, { useState } from "react";
import "@/styles/sync-dialog.css";
import { useTranslation } from "next-i18next";

interface ExpandableProductProps {
  products: string[];
  activeTab?: string;
}

const ExpandableProduct: React.FC<ExpandableProductProps> = ({
  products,
  activeTab,
}) => {
  const [expanded, setExpanded] = useState(false);

  const displayedProducts = expanded ? products : products.slice(0, 5);

  const toggleExpand = () => setExpanded((prev) => !prev);
  const {t} = useTranslation("overview")

  return (
    <div className="expandable-serials-block">
      <div className="serials-header">
        <div>{t("selected_products")}</div>
      </div>

      <div className="serials-list">
        {displayedProducts.map((product_name, idx) => (
          <div key={idx} className="serial-item">
            <span className="serial-name">{product_name}</span>
          </div>
        ))}
      </div>

      {products.length > 5 && (
        <div className="expand-toggle" onClick={toggleExpand}>
          {expanded ? t("hide") : `+5 ${t("more")}`}
        </div>
      )}
    </div>
  );
};

export default ExpandableProduct;
