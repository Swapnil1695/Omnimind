import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from './contexts/authcontext.jsx';
import Button from './components/button.jsx';
import Card from './components/card.jsx';
import './ad-system.css';

const AdSystem = () => {
  const { user } = useAuth();
  const [ads, setAds] = useState([]);
  const [adSettings, setAdSettings] = useState({
    enabled: true,
    frequency: 'medium',
    categories: ['productivity', 'business', 'technology'],
    showPromotedFeatures: true,
    allowPersonalizedAds: true,
  });
  const [revenueStats, setRevenueStats] = useState({
    today: 0,
    thisMonth: 0,
    total: 0,
    adViews: 0,
    adClicks: 0,
  });
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    loadAds();
    loadSettings();
    loadRevenueStats();
    checkPremiumStatus();
  }, []);

  useEffect(() => {
    saveSettings();
  }, [adSettings]);

  const loadAds = async () => {
    // Load ads from API
    const mockAds = [
      {
        id: 1,
        type: 'banner',
        title: 'Boost Productivity',
        description: 'Try our premium task management tool for free',
        image: 'https://via.placeholder.com/300x100/3b82f6/ffffff?text=Productivity+Tool',
        link: 'https://example.com/productivity',
        category: 'productivity',
        sponsor: 'ProductivityPro',
        cta: 'Try Free',
      },
      {
        id: 2,
        type: 'suggestion',
        title: 'Recommended Tool',
        description: 'Based on your project management patterns',
        content: 'Try TimeTracker for better time management',
        link: 'https://example.com/timetracker',
        category: 'business',
        sponsor: 'TimeTracker Inc',
      },
      {
        id: 3,
        type: 'feature',
        title: 'Sponsored Feature',
        description: 'Automated reporting powered by',
        feature: 'ReportMaster',
        link: 'https://example.com/reporting',
        category: 'technology',
        sponsor: 'ReportMaster',
      },
    ];
    
    setAds(mockAds);
  };

  const loadSettings = () => {
    const saved = localStorage.getItem('omnimind_ad_settings');
    if (saved) {
      setAdSettings(JSON.parse(saved));
    }
  };

  const saveSettings = () => {
    localStorage.setItem('omnimind_ad_settings', JSON.stringify(adSettings));
  };

  const loadRevenueStats = () => {
    // Load revenue stats from API
    const mockStats = {
      today: 12.50,
      thisMonth: 375.00,
      total: 1250.00,
      adViews: 12500,
      adClicks: 625,
    };
    
    setRevenueStats(mockStats);
  };

  const checkPremiumStatus = () => {
    // Check if user has premium subscription
    setIsPremium(user?.subscription?.plan === 'premium');
  };

  const handleAdClick = (adId) => {
    // Track ad click
    setRevenueStats(prev => ({
      ...prev,
      adClicks: prev.adClicks + 1,
    }));
    
    // Open ad link in new tab
    const ad = ads.find(a => a.id === adId);
    if (ad?.link) {
      window.open(ad.link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAdView = (adId) => {
    // Track ad view
    setRevenueStats(prev => ({
      ...prev,
      adViews: prev.adViews + 1,
    }));
  };

  const handleSettingsChange = (key, value) => {
    setAdSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleUpgradeToPremium = () => {
    // Redirect to premium upgrade page
    console.log('Redirect to premium upgrade');
  };

  const getAdComponent = (ad) => {
    switch (ad.type) {
      case 'banner':
        return (
          <div className="ad-banner">
            <img src={ad.image} alt={ad.title} />
            <div className="banner-content">
              <h4>{ad.title}</h4>
              <p>{ad.description}</p>
              <div className="banner-footer">
                <span className="sponsored-by">Sponsored by {ad.sponsor}</span>
                <Button 
                  onClick={() => handleAdClick(ad.id)}
                  size="small"
                  variant="outline"
                >
                  {ad.cta}
                </Button>
              </div>
            </div>
          </div>
        );
        
      case 'suggestion':
        return (
          <div className="ad-suggestion">
            <div className="suggestion-header">
              <span className="suggestion-badge">Suggested for you</span>
              <span className="sponsored-badge">Sponsored</span>
            </div>
            <h5>{ad.title}</h5>
            <p>{ad.description}</p>
            <div className="suggestion-content">{ad.content}</div>
            <Button 
              onClick={() => handleAdClick(ad.id)}
              size="small"
              variant="primary"
            >
              Learn More
            </Button>
          </div>
        );
        
      case 'feature':
        return (
          <div className="ad-feature">
            <div className="feature-header">
              <h5>{ad.title}</h5>
              <span className="powered-by">Powered by {ad.sponsor}</span>
            </div>
            <div className="feature-content">
              <strong>{ad.feature}</strong> - {ad.description}
            </div>
            <Button 
              onClick={() => handleAdClick(ad.id)}
              size="small"
              variant="outline"
            >
              Try Now
            </Button>
          </div>
        );
        
      default:
        return null;
    }
  };

  if (isPremium) {
    return (
      <Card className="premium-message">
        <h3>🎉 Premium Member</h3>
        <p>You're enjoying an ad-free experience with premium features.</p>
        <p>Your subscription helps support the development of OmniMind AI Platform.</p>
      </Card>
    );
  }

  return (
    <div className="ad-system">
      <div className="ad-header">
        <h3>Advertising System</h3>
        <div className="ad-controls">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={adSettings.enabled}
              onChange={(e) => handleSettingsChange('enabled', e.target.checked)}
            />
            <span className="slider"></span>
            <span>Show Ads</span>
          </label>
          
          <Button onClick={handleUpgradeToPremium} variant="primary">
            Upgrade to Premium
          </Button>
        </div>
      </div>

      <div className="ad-revenue-stats">
        <Card className="revenue-card">
          <h4>Today's Revenue</h4>
          <div className="revenue-amount">${revenueStats.today.toFixed(2)}</div>
          <small>From ads</small>
        </Card>
        
        <Card className="revenue-card">
          <h4>This Month</h4>
          <div className="revenue-amount">${revenueStats.thisMonth.toFixed(2)}</div>
          <small>Total revenue</small>
        </Card>
        
        <Card className="revenue-card">
          <h4>Total Revenue</h4>
          <div className="revenue-amount">${revenueStats.total.toFixed(2)}</div>
          <small>Since you joined</small>
        </Card>
        
        <Card className="revenue-card">
          <h4>Ad Engagement</h4>
          <div className="engagement-stats">
            <div className="stat-item">
              <span className="stat-label">Views:</span>
              <span className="stat-value">{revenueStats.adViews.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Clicks:</span>
              <span className="stat-value">{revenueStats.adClicks.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">CTR:</span>
              <span className="stat-value">
                {((revenueStats.adClicks / revenueStats.adViews) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="ad-settings">
        <h4>Ad Preferences</h4>
        <div className="settings-grid">
          <div className="setting-item">
            <label>Ad Frequency</label>
            <select
              value={adSettings.frequency}
              onChange={(e) => handleSettingsChange('frequency', e.target.value)}
            >
              <option value="low">Low (fewer ads)</option>
              <option value="medium">Medium (balanced)</option>
              <option value="high">High (more relevant ads)</option>
            </select>
          </div>
          
          <div className="setting-item">
            <label>Ad Categories</label>
            <div className="category-tags">
              {['productivity', 'business', 'technology', 'education', 'health', 'finance'].map(cat => (
                <label key={cat} className="category-tag">
                  <input
                    type="checkbox"
                    checked={adSettings.categories.includes(cat)}
                    onChange={(e) => {
                      const newCategories = e.target.checked
                        ? [...adSettings.categories, cat]
                        : adSettings.categories.filter(c => c !== cat);
                      handleSettingsChange('categories', newCategories);
                    }}
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="setting-item">
            <label>Promoted Features</label>
            <label className="toggle-switch small">
              <input
                type="checkbox"
                checked={adSettings.showPromotedFeatures}
                onChange={(e) => handleSettingsChange('showPromotedFeatures', e.target.checked)}
              />
              <span className="slider"></span>
              <span>Show promoted tools</span>
            </label>
          </div>
          
          <div className="setting-item">
            <label>Personalized Ads</label>
            <label className="toggle-switch small">
              <input
                type="checkbox"
                checked={adSettings.allowPersonalizedAds}
                onChange={(e) => handleSettingsChange('allowPersonalizedAds', e.target.checked)}
              />
              <span className="slider"></span>
              <span>Show relevant ads</span>
            </label>
          </div>
        </div>
      </div>

      <div className="ad-preview">
        <h4>Sample Ad Placements</h4>
        <div className="ad-placements">
          <div className="placement-banner">
            <h5>Banner Ad (Dashboard)</h5>
            {getAdComponent(ads[0])}
          </div>
          
          <div className="placement-suggestions">
            <h5>Suggested Tools (Task View)</h5>
            {getAdComponent(ads[1])}
          </div>
          
          <div className="placement-features">
            <h5>Sponsored Feature (Project View)</h5>
            {getAdComponent(ads[2])}
          </div>
        </div>
      </div>

      <div className="ad-explanation">
        <Card className="explanation-card">
          <h4>How Our Ad System Works</h4>
          <ul>
            <li>💰 <strong>Earn Revenue:</strong> You earn a portion of ad revenue generated</li>
            <li>🎯 <strong>Relevant Ads:</strong> Ads are matched to your work patterns</li>
            <li>⚙️ <strong>Customizable:</strong> Control ad frequency and categories</li>
            <li>📊 <strong>Transparent:</strong> See exactly how much revenue you generate</li>
            <li>🚫 <strong>No Intrusion:</strong> Ads are designed to be helpful, not annoying</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default AdSystem;