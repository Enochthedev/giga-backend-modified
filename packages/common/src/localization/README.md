# Localization and Internationalization (i18n)

This module provides comprehensive localization support including multi-language content, currency conversion, regional configurations, and cultural adaptations.

## Features

- **Multi-language Support**: Complete i18n with pluralization and interpolation
- **Currency Conversion**: Real-time currency conversion with multiple providers
- **Regional Configuration**: Region-specific settings, compliance, and business rules
- **Content Localization**: Localized content delivery with cultural adaptations
- **Date/Time Formatting**: Locale-aware date and time formatting
- **Cultural Adaptations**: Region-specific UI and content modifications

## Quick Start

### 1. Initialize Localization Services

```typescript
import { i18n, currencyService, regionConfig } from '@common/localization';

// Initialize i18n with supported locales
await i18n.initialize([
  {
    code: 'en-US',
    name: 'English (US)',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      currency: { symbol: '$', position: 'before' }
    },
    pluralRules: [
      { condition: 'n === 1', form: 'one' },
      { condition: 'n !== 1', form: 'other' }
    ]
  },
  {
    code: 'fr-FR',
    name: 'Français (France)',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: ',',
      thousands: ' ',
      currency: { symbol: '€', position: 'after' }
    },
    pluralRules: [
      { condition: 'n <= 1', form: 'one' },
      { condition: 'n > 1', form: 'other' }
    ]
  }
]);

// Initialize currency service
await currencyService.initialize();

// Initialize region configurations
await regionConfig.initialize();
```

### 2. Add Localization Middleware

```typescript
import { localizationMiddleware } from './middleware/localization-middleware';

const app = express();

// Add localization middleware
app.use('/api', ...localizationMiddleware);
```

### 3. Use in Controllers

```typescript
import { t, formatCurrency, formatDate } from '@common/localization';

class ProductController {
  async getProduct(req: LocalizedRequest, res: Response) {
    const product = await productService.getProduct(req.params.id);
    
    // Translate product name
    const localizedName = req.t!('product.name', { name: product.name });
    
    // Format price in tenant currency
    const formattedPrice = req.formatCurrency!(product.price);
    
    // Format dates
    const formattedDate = req.formatDate!(product.createdAt);
    
    res.json({
      ...product,
      name: localizedName,
      price: formattedPrice,
      createdAt: formattedDate
    });
  }
}
```

## Internationalization (i18n)

### Translation Keys

Organize translations in namespaces:

```typescript
// Translation keys
const keys = {
  'common.welcome': 'Welcome',
  'common.login': 'Login',
  'ecommerce.add_to_cart': 'Add to Cart',
  'ecommerce.checkout': 'Checkout',
  'validation.required_field': 'This field is required'
};
```

### Basic Translation

```typescript
// Simple translation
const welcome = i18n.translate('common.welcome');

// Translation with interpolation
const greeting = i18n.translate('common.greeting', { name: 'John' });

// Translation with default value
const message = i18n.translate({
  key: 'unknown.key',
  defaultValue: 'Default message'
});
```

### Pluralization

```typescript
// Pluralization based on count
const itemCount = i18n.translatePlural('items', 1); // "1 item"
const itemsCount = i18n.translatePlural('items', 5); // "5 items"

// With interpolation
const cartItems = i18n.translatePlural('cart.items', count, {
  count,
  total: formatCurrency(total)
});
```

### Date and Time Formatting

```typescript
const date = new Date();

// Format date according to locale
const formattedDate = i18n.formatDate(date); // US: "12/25/2024", EU: "25/12/2024"

// Format time according to locale
const formattedTime = i18n.formatTime(date); // US: "2:30 PM", EU: "14:30"

// Custom format
const customDate = i18n.formatDate(date, 'YYYY-MM-DD');
```

### Number Formatting

```typescript
// Format numbers according to locale
const number = i18n.formatNumber(1234.56); // US: "1,234.56", EU: "1.234,56"

// Format currency
const price = i18n.formatCurrency(99.99); // US: "$99.99", EU: "99,99 €"

// Format percentage
const percentage = i18n.formatNumber(0.1234, { style: 'percent' }); // "12.34%"
```

## Currency Conversion

### Basic Currency Operations

```typescript
// Convert between currencies
const conversion = await currencyService.convert(100, 'USD', 'EUR');
console.log(conversion);
// {
//   originalAmount: 100,
//   originalCurrency: 'USD',
//   convertedAmount: 85.23,
//   convertedCurrency: 'EUR',
//   exchangeRate: 0.8523,
//   timestamp: Date
// }

// Format currency
const formatted = currencyService.formatCurrency(1234.56, 'EUR'); // "€1,234.56"

// Get currency info
const currencyInfo = currencyService.getCurrencyInfo('USD');
console.log(currencyInfo);
// {
//   code: 'USD',
//   name: 'US Dollar',
//   symbol: '$',
//   decimals: 2,
//   symbolPosition: 'before'
// }
```

### Multi-Currency Support

```typescript
// Get supported currencies
const currencies = currencyService.getSupportedCurrencies();

// Check if currency is supported
const isSupported = currencyService.isCurrencySupported('NGN'); // true

// Get currency by region
const regionCurrency = currencyService.getCurrencyByRegion('NG'); // 'NGN'
```

## Regional Configuration

### Regional Settings

```typescript
// Get region configuration
const config = regionConfig.getRegionConfig('NG');
console.log(config);
// {
//   code: 'NG',
//   name: 'Nigeria',
//   timezone: 'Africa/Lagos',
//   currency: 'NGN',
//   locale: 'en-NG',
//   dateFormat: 'DD/MM/YYYY',
//   businessDays: [1,2,3,4,5],
//   businessHours: { start: '08:00', end: '17:00' }
// }

// Check business hours
const isOpen = regionConfig.isBusinessOpen(new Date(), 'NG');

// Get next business day
const nextBusinessDay = regionConfig.getNextBusinessDay(new Date(), 'NG');
```

### Tax and Compliance

```typescript
// Get tax settings
const taxSettings = regionConfig.getTaxSettings('NG');
console.log(taxSettings);
// {
//   enabled: true,
//   type: 'vat',
//   rate: 7.5,
//   inclusive: true,
//   taxIdRequired: true
// }

// Get compliance requirements
const compliance = regionConfig.getComplianceSettings('NG');
console.log(compliance);
// {
//   gdpr: false,
//   ageVerification: { required: true, minimumAge: 18 },
//   kycRequired: true,
//   dataRetention: { user: 1825, transaction: 2555 }
// }
```

### Address Formatting

```typescript
// Format address according to region
const address = {
  street: '123 Main Street',
  city: 'Lagos',
  state: 'Lagos State',
  postalCode: '100001'
};

const formatted = regionConfig.formatAddress(address, 'NG');
// "123 Main Street\nLagos, Lagos State\n100001"

// Validate postal code
const isValid = regionConfig.validatePostalCode('100001', 'NG'); // true
```

## Content Localization

### Localized Content Management

```typescript
// Get localized content
const content = await contentManager.getContent({
  category: 'ecommerce',
  type: 'text',
  locale: 'fr-FR',
  region: 'FR',
  culturalPreferences: true
});

// Create localized content
const contents = await contentManager.createContent({
  type: 'text',
  category: 'marketing',
  content: {
    title: 'Welcome to our store',
    description: 'Find amazing products at great prices'
  }
}, ['en-US', 'fr-FR', 'es-ES']);
```

### Cultural Adaptations

```typescript
// Content with cultural adaptations
const adaptedContent = {
  id: 'banner-1',
  type: 'image',
  category: 'marketing',
  locale: 'ar-SA',
  region: 'SA',
  content: {
    url: '/images/banner-ar.jpg',
    alt: 'مرحبا بكم في متجرنا'
  },
  culturalAdaptations: [
    {
      type: 'layout',
      region: 'SA',
      adaptation: { direction: 'rtl' },
      reason: 'Right-to-left text direction'
    },
    {
      type: 'color',
      region: 'SA',
      adaptation: { primary: '#008751', secondary: '#ffffff' },
      reason: 'Regional color preferences'
    }
  ]
};
```

### Content Validation

```typescript
// Validate content for region
const validation = await contentManager.validateContent(content, 'SA');
if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

## Integration with Multi-Tenancy

### Tenant-Specific Localization

```typescript
import { tenantContext } from '@common/multi-tenancy';

// Localization automatically uses tenant settings
tenantContext.run({ tenant }, () => {
  // Uses tenant's locale and region
  const welcome = i18n.translate('common.welcome');
  
  // Uses tenant's currency
  const price = currencyService.formatCurrency(99.99);
  
  // Uses tenant's regional settings
  const taxRate = regionConfig.getTaxSettings().rate;
});
```

### Middleware Integration

```typescript
// Combined tenant and localization middleware
app.use('/api', tenantMiddleware(tenantService));
app.use('/api', ...localizationMiddleware);

// Routes automatically have localization context
app.get('/api/products', (req: LocalizedRequest, res) => {
  // req.locale, req.region, req.currency are available
  // req.t(), req.formatCurrency(), req.formatDate() are available
});
```

## Best Practices

### Translation Management

1. **Use namespaces**: Organize translations by feature/module
2. **Provide context**: Include descriptions for translators
3. **Handle pluralization**: Use proper plural forms for each language
4. **Interpolation**: Use variables for dynamic content
5. **Fallbacks**: Always provide fallback translations

### Currency Handling

1. **Store in base currency**: Store prices in a consistent base currency
2. **Convert on display**: Convert to user's currency for display only
3. **Cache exchange rates**: Cache rates to improve performance
4. **Handle rate changes**: Update rates regularly and handle failures gracefully
5. **Precision**: Use appropriate decimal precision for each currency

### Regional Compliance

1. **Know your regions**: Understand legal requirements for each region
2. **Validate early**: Validate regional compliance during data entry
3. **Document restrictions**: Clearly document regional restrictions
4. **Monitor changes**: Stay updated on regulatory changes
5. **Test thoroughly**: Test all regional variations

### Performance Optimization

1. **Cache translations**: Cache frequently used translations
2. **Lazy loading**: Load translations on demand
3. **CDN for content**: Use CDN for localized static content
4. **Optimize queries**: Optimize database queries for localized content
5. **Monitor performance**: Track localization performance metrics

## Troubleshooting

### Common Issues

1. **Missing translations**: Provide fallback values
2. **Currency conversion failures**: Handle API failures gracefully
3. **Regional restrictions**: Clearly communicate restrictions to users
4. **Date format confusion**: Use clear date format indicators
5. **Cultural sensitivity**: Review content for cultural appropriateness

### Debug Mode

Enable debug logging:

```typescript
process.env.DEBUG_LOCALIZATION = 'true';
```

This will log all translation lookups, currency conversions, and regional configurations.