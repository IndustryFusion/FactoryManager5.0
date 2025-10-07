
import React, { useState } from "react";
import "@/styles/sync-dialog.css";

interface Product {
  product_name: string;
}

interface ExpandableProductProps {
  products: Product[];
  activeTab?: string;
}

const ExpandableProduct: React.FC<ExpandableProductProps> = ({
  products,
  activeTab,
}) => {
  const [expanded, setExpanded] = useState(false);

  const displayedProducts = expanded ? products : products.slice(0, 5);

  const toggleExpand = () => setExpanded((prev) => !prev);

  return (
    <div className="expandable-serials-block">
      <div className="serials-header">
        <div>Selected Products</div>
      </div>

      <div className="serials-list">
        {displayedProducts.map((item, idx) => (
          <div key={idx} className="serial-item">
            <span className="serial-name">{item.product_name}</span>
          </div>
        ))}
      </div>

      {products.length > 5 && (
        <div className="expand-toggle" onClick={toggleExpand}>
          {expanded ? "Hide" : `+5 more`}
        </div>
      )}
    </div>
  );
};

export default ExpandableProduct;
