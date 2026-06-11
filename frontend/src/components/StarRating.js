import React, { useState } from 'react';

const StarRating = ({ value, onChange, size = 'default', readonly = false }) => {
  const [hoverValue, setHoverValue] = useState(0);
  const stars = [1, 2, 3, 4, 5];
  
  const sizeClass = size === 'small' ? 'star-small' : size === 'large' ? 'star-large' : '';
  
  const displayValue = readonly ? value : (hoverValue || value);
  
  const handleClick = (star) => {
    if (readonly) return;
    if (onChange) {
      onChange(star);
    }
  };

  return (
    <div className={`star-rating ${sizeClass} ${readonly ? 'readonly' : ''}`}>
      {stars.map((star) => (
        <span
          key={star}
          className={`star ${star <= displayValue ? 'filled' : 'empty'}`}
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

export default StarRating;
