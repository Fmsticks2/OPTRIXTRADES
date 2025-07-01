/**
 * Message templates for the 10-day follow-up sequence
 */

/**
 * Get follow-up message template by day
 * @param {number} day - Day in the sequence (1-10)
 * @param {Object} userData - User data for personalization
 * @returns {Object} - Message template with text and keyboard options
 */
const getFollowUpTemplate = (day, userData) => {
  const firstName = userData.first_name || 'there';
  
  const templates = {
    // Day 1 (6 hours): Reminder - Check-in message about incomplete setup
    1: {
      type: 'reminder',
      text: `Hey ${firstName}! 👋\n\nI noticed you haven't completed your OPTRIXTRADES setup yet. You're just a few steps away from accessing our premium trading signals and auto-trading features.\n\nNeed any help with the registration or deposit process?`,
      buttons: [
        { text: "I've Registered", callback_data: 'registered' },
        { text: "Need Help Signing Up", callback_data: 'help_signup' },
        { text: "Need Support Making a Deposit", callback_data: 'help_deposit' }
      ]
    },
    
    // Day 2 (23 hours): Scarcity - Social proof (42 traders activated this week)
    2: {
      type: 'social_proof',
      text: `${firstName}, just wanted to let you know that 42 traders activated their OPTRIXTRADES premium access this week alone! 🔥\n\nThey're already receiving our high-accuracy signals and some have enabled the auto-trading feature.\n\nDon't miss out on the opportunities they're capitalizing on right now.`,
      buttons: [
        { text: "I'm Ready to Join", callback_data: 'registered' },
        { text: "Show Me Proof", callback_data: 'show_proof' }
      ]
    },
    
    // Day 3 (22 hours): Value recap - List all free benefits
    3: {
      type: 'value_recap',
      text: `Hey ${firstName}! 📊\n\nJust a reminder of everything you'll get with your OPTRIXTRADES premium access:\n\n✅ VIP Trading Signals (87% win rate)\n✅ 6-Figure Trader Strategies\n✅ Private Trading Community\n✅ Signup Bonus up to $500\n✅ Automated Trading Bot\n\nAll this for just a $20 minimum deposit with our partner broker!`,
      buttons: [
        { text: "Activate Now", callback_data: 'registered' },
        { text: "How Does It Work?", callback_data: 'how_it_works' }
      ]
    },
    
    // Day 4: Personal approach - Offer to help with concerns
    4: {
      type: 'personal_approach',
      text: `${firstName}, I wanted to personally check in with you. 🤝\n\nMany traders have questions or concerns before getting started. Is there anything specific holding you back from activating your premium access?\n\nI'm here to address any questions you might have about our service, the broker, or the trading process.`,
      buttons: [
        { text: "I Have a Question", callback_data: 'have_question' },
        { text: "Ready to Proceed", callback_data: 'registered' }
      ]
    },
    
    // Day 5: Last chance - Week closing warning with exit option
    5: {
      type: 'last_chance',
      text: `${firstName}, just a heads up! 🚨\n\nWe're closing this week's registration for new premium members soon. If you want to join the traders who are already benefiting from our signals, now is the time.\n\nIf you're not interested, no problem - just let me know and I won't bother you again.`,
      buttons: [
        { text: "I Want to Join", callback_data: 'registered' },
        { text: "Remove Me from Follow-ups", callback_data: 'remove_followup' }
      ]
    },
    
    // Day 6: Education - Trust building, legitimacy proof
    6: {
      type: 'education',
      text: `${firstName}, I thought you might be interested in how OPTRIXTRADES works. 🧠\n\nOur system analyzes market data using advanced algorithms developed by professional traders with 10+ years of experience. We only send signals with a high probability of success.\n\nWe're transparent about our results and many of our members have been with us for years.`,
      buttons: [
        { text: "See Performance History", callback_data: 'performance_history' },
        { text: "Join Now", callback_data: 'registered' }
      ]
    },
    
    // Day 7: Humor - Light-hearted ghosting joke
    7: {
      type: 'humor',
      text: `${firstName}, are you ghosting me? 👻\n\nI promise I'm not clingy, but our trading signals are feeling rejected! They just want to help you make profitable trades.\n\nLet's turn this one-sided conversation into a profitable partnership!`,
      buttons: [
        { text: "Sorry, I'm Ready Now", callback_data: 'registered' },
        { text: "Still Considering", callback_data: 'still_considering' }
      ]
    },
    
    // Day 8: FOMO - Success story ($100 to $390 in 4 days)
    8: {
      type: 'success_story',
      text: `${firstName}, check this out! 📈\n\nOne of our members who joined last week started with just $100 and grew it to $390 in 4 days using our signals!\n\nI'd hate for you to miss out on similar opportunities. Our signals are particularly strong this week.`,
      buttons: [
        { text: "I Don't Want to Miss Out", callback_data: 'registered' },
        { text: "Show Me More Results", callback_data: 'more_results' }
      ]
    },
    
    // Day 9: Small start - Encourage $20 minimum deposit
    9: {
      type: 'small_start',
      text: `${firstName}, did you know you can start with just $20? 💰\n\nYou don't need a large investment to begin benefiting from our premium signals. Many successful traders started small and gradually increased their investment as they gained confidence.\n\nEven with a minimum deposit, you'll get full access to our premium features.`,
      buttons: [
        { text: "Start with $20", callback_data: 'registered' },
        { text: "I Need More Info", callback_data: 'more_info' }
      ]
    },
    
    // Day 10: Hard close - Final reminder with removal option
    10: {
      type: 'final_reminder',
      text: `${firstName}, this is my final message about OPTRIXTRADES premium access. ⏱️\n\nIf you're interested in transforming your trading with our signals and auto-trading features, now is the time to act. If not, I completely understand and won't send any more reminders.\n\nThank you for considering OPTRIXTRADES!`,
      buttons: [
        { text: "Activate Premium", callback_data: 'registered' },
        { text: "Remove Me", callback_data: 'remove_followup' }
      ]
    }
  };
  
  return templates[day] || templates[1]; // Default to day 1 if invalid day
};

/**
 * Welcome message template
 * @param {Object} userData - User data for personalization
 * @returns {Object} - Welcome message template
 */
const getWelcomeTemplate = (userData) => {
  const firstName = userData.first_name || 'there';
  
  return {
    text: `Welcome to OPTRIXTRADES, ${firstName}! 🚀\n\nWe're excited to have you join our trading community. Here's what you can look forward to:\n\n💎 VIP Trading Signals\n📊 6-Figure Trader Strategies\n👥 Private Trading Community\n💰 Signup Bonuses up to $500\n🤖 Automated Trading Bot\n\nReady to get started?`,
    buttons: [
      { text: "➡️ Get Free VIP Access", callback_data: 'get_vip_access' }
    ]
  };
};

/**
 * Registration instructions template
 * @param {Object} userData - User data for personalization
 * @param {string} affiliateLink - Broker affiliate link
 * @returns {Object} - Registration instructions template
 */
const getRegistrationTemplate = (userData, affiliateLink) => {
  const firstName = userData.first_name || 'there';
  
  return {
    text: `Great choice, ${firstName}! 🌟\n\nHere's your 3-step activation process:\n\n1️⃣ Register with our broker partner using this link:\n${affiliateLink}\n\n2️⃣ Deposit $20 or more\n\n3️⃣ Send me your UID and a screenshot of your deposit\n\n💰 BONUS TIERS:\n• $100+: Full OPTRIX Web AI Portal access\n• $500+: All signal options, VIP telegram group, private sessions, AI Auto-Trading\n\nWe earn commissions from the broker, not from your money - that's how we provide this service for free!`,
    buttons: [
      { text: "I've Registered", callback_data: 'registered' },
      { text: "Need help signing up", callback_data: 'help_signup' },
      { text: "Need support making a deposit", callback_data: 'help_deposit' }
    ]
  };
};

/**
 * Verification request template
 * @param {Object} userData - User data for personalization
 * @returns {Object} - Verification request template
 */
const getVerificationTemplate = (userData) => {
  const firstName = userData.first_name || 'there';
  
  return {
    text: `Perfect, ${firstName}! 📸\n\nTo verify your account and gain access to our premium channels, please:\n\n1️⃣ Send your broker UID in this format: "UID: [your number]"\n\n2️⃣ Upload a screenshot of your deposit\n\nOnce verified, you'll be automatically added to our premium channel. We're also hosting an exclusive live session soon with limited slots - verified members get priority access!`,
    buttons: []
  };
};

module.exports = {
  getFollowUpTemplate,
  getWelcomeTemplate,
  getRegistrationTemplate,
  getVerificationTemplate
};