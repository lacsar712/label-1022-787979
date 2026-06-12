import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import StarRating from './StarRating';
import { collaborationReviewsApi } from '../api';
import { showToast } from './Toast';

const ReviewModal = ({ isOpen, onClose, collaboration, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState(null);
  const [formData, setFormData] = useState({
    content_quality: 5,
    cooperation_level: 5,
    delivery_effect: 5,
    comment: ''
  });

  const fetchReview = useCallback(async () => {
    try {
      setLoading(true);
      const data = await collaborationReviewsApi.getByCollaboration(collaboration.id);
      setReview(data);
      setFormData({
        content_quality: data.content_quality,
        cooperation_level: data.cooperation_level,
        delivery_effect: data.delivery_effect,
        comment: data.comment || ''
      });
    } catch (error) {
      setReview(null);
      setFormData({
        content_quality: 5,
        cooperation_level: 5,
        delivery_effect: 5,
        comment: ''
      });
    } finally {
      setLoading(false);
    }
  }, [collaboration]);

  useEffect(() => {
    if (isOpen && collaboration) {
      fetchReview();
    }
  }, [isOpen, collaboration, fetchReview]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const submitData = {
        collaboration_id: collaboration.id,
        ...formData
      };
      await collaborationReviewsApi.create(submitData);
      showToast('success', '评价提交成功');
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels = {
    content_quality: '内容质量',
    cooperation_level: '配合程度',
    delivery_effect: '投放效果'
  };

  const ratingDescriptions = {
    content_quality: '内容创意、制作水平、专业度等',
    cooperation_level: '沟通效率、响应速度、配合度等',
    delivery_effect: '曝光量、互动率、转化效果等'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={review ? '查看评价' : '合作评价'}
      size="medium"
      footer={
        !review && (
          <>
            <button className="btn btn-secondary" onClick={onClose}>取消</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? '提交中...' : '提交评价'}
            </button>
          </>
        )
      }
    >
      {loading && !review ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="review-form">
          <div className="review-collaboration-info">
            <div className="review-project-name">{collaboration?.project_name}</div>
            <div className="review-influencer-name">
              Influencer: {collaboration?.influencer?.name}
            </div>
          </div>

          <div className="rating-section">
            {Object.keys(ratingLabels).map((key) => (
              <div key={key} className="rating-item">
                <div className="rating-label">
                  <span className="rating-label-text">{ratingLabels[key]}</span>
                  <span className="rating-desc">{ratingDescriptions[key]}</span>
                </div>
                <div className="rating-stars">
                  <StarRating
                    value={formData[key]}
                    onChange={(val) => setFormData({ ...formData, [key]: val })}
                    size="large"
                    readonly={!!review}
                  />
                  <span className="rating-value">{formData[key]}.0</span>
                </div>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">文字评语</label>
            <textarea
              className="form-textarea"
              placeholder="请输入您的评价和建议..."
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              readOnly={!!review}
              style={{ minHeight: '100px' }}
            />
          </div>

          {review && (
            <div className="review-meta">
              <span>评价人: {review.reviewer?.nickname || review.reviewer?.username}</span>
              <span>评价时间: {new Date(review.created_at).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ReviewModal;
