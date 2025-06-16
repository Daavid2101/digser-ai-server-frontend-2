import React, { useState } from "react";

function CarouselMessage({ items }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  };

  const handlePrev = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + items.length) % items.length
    );
  };

  const currentItem = items[currentIndex];

  return (
    <div className="relative w-full p-2">
      <h3 className="font-bold">{currentItem.title}</h3>
      <p>{currentItem.description}</p>
      <a href={currentItem.link} target="_blank" rel="noopener noreferrer">
        Zum Link
      </a>

      <button
        onClick={handlePrev}
        className="absolute left-0 top-1/2 transform -translate-y-1/2"
      >
        ⟵
      </button>
      <button
        onClick={handleNext}
        className="absolute right-0 top-1/2 transform -translate-y-1/2"
      >
        ⟶
      </button>
    </div>
  );
}

export default CarouselMessage;
