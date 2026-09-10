/**
 * JsonLd Component
 * 用于在页面中注入 JSON-LD 结构化数据
 * 
 * @example
 * <JsonLd data={generateFAQSchema(faqs)} />
 */

interface JsonLdProps {
  data: Record<string, any> | Record<string, any>[];
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 0),
      }}
    />
  );
}
