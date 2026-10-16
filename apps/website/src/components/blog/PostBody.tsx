import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// The post title is the page's only H1, so Markdown "#" headings render as H2.
export function PostBody({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h2>{children}</h2>,
        a: ({ href, children }) =>
          href?.startsWith("http") ? (
            <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          ) : (
            <a href={href}>{children}</a>
          ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
