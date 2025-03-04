import { create } from "zustand";
import { useQuery } from "@tanstack/react-query";
import { ChangeEvent, useRef } from "react";
import { evaluate } from "mathjs";

const fetchMenu = async () => {
  const data = await fetch(
    "https://652f91320b8d8ddac0b2b62b.mockapi.io/autocomplete"
  );
  return data.json();
};

const Operands = ["+", "-", "*", "/", ")", "(", "^", "%"];

type ContentItem = Partial<{
  name: string;
  value: string;
  type: "tag";
  inputs: string;
  category: string;
}>;

type StoreState = {
  query: string;
  query2: string;
  filteredSuggestions: ContentItem[];
  content: ContentItem[];
  finalResult: string;
  setQuery: (query: string) => void;
  setQuery2: (query2: string) => void;
  setFilteredSuggestions: (suggestions: ContentItem[]) => void;
  setContent: (content: (c: ContentItem[]) => ContentItem[]) => void;
  setFinalResult: (result: string) => void;
};

const useStore = create<StoreState>((set) => ({
  query: "",
  query2: "",
  filteredSuggestions: [],
  content: [],
  finalResult: "",
  setQuery: (query) => set({ query }),
  setQuery2: (query2) => set({ query2 }),
  setFilteredSuggestions: (filteredSuggestions) => set({ filteredSuggestions }),
  setContent: (callback) =>
    set((state) => ({ content: callback(state.content) })),
  setFinalResult: (finalResult) => set({ finalResult }),
}));

export default function App() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { data } = useQuery<Array<ContentItem>>({
    queryKey: ["menu"],
    queryFn: fetchMenu,
  });
  const {
    query,
    query2,
    filteredSuggestions,
    content,
    finalResult,
    setQuery,
    setQuery2,
    setFilteredSuggestions,
    setContent,
    setFinalResult,
  } = useStore();

  const handleChange =
    (querySetter: typeof setQuery, position: "left" | "right") =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (Operands.includes(value[value.length - 1])) {
        if (value.length > 1) {
          const prevValue = value.slice(0, -1);
          const operand = value[value.length - 1];
          setContent((prev) =>
            position === "left"
              ? [
                  { name: prevValue, value: prevValue },
                  { name: operand, value: operand },
                  ...prev,
                ]
              : [
                  ...prev,
                  { name: prevValue, value: prevValue },
                  { name: operand, value: operand },
                ]
          );
          querySetter("");
          return;
        }
        setContent((prev) =>
          position === "left"
            ? [{ name: value, value: value }, ...prev]
            : [...prev, { name: value, value: value }]
        );
        return;
      }
      querySetter(value.length > 1 ? value : value.trim());
      setFilteredSuggestions(
        value.trim()
          ? (data || []).filter((s) =>
              s.name?.toLowerCase().includes(value.toLowerCase())
            )
          : []
      );
    };

  const handleDelete = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      setContent((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSelect = (suggestion: ContentItem) => {
    setContent((prev) =>
      query
        ? [...prev, { ...suggestion, type: "tag" }]
        : [{ ...suggestion, type: "tag" }, ...prev]
    );
    setQuery("");
    setQuery2("");
    setFilteredSuggestions([]);
    inputRef.current?.focus();
  };

  return (
    <div>
      <div
        style={{
          padding: "8px",
          // minHeight: "100px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          backgroundColor: "white",
        }}
      >
        {content.length > 0 && (
          <input
            type="text"
            value={query2}
            onChange={handleChange(setQuery2, "left")}
            style={{
              width: 8,
              outline: "none",
              border: "none",
              paddingInline: 1,
              paddingLeft: 8,
            }}
          />
        )}
        {content.map((item, index) => (
          <div key={index}>
            <span
              style={
                item.type === "tag"
                  ? {
                      padding: "4px 8px",
                      backgroundColor: "#e0e0e0",
                      borderRadius: "4px",
                    }
                  : {}
              }
            >
              {item.name}
              {item.inputs && (
                <span
                  style={{ marginLeft: 10, cursor: "pointer" }}
                  onClick={() => alert(JSON.stringify(item.inputs))}
                >
                  &#128065;
                </span>
              )}
            </span>
            {index !== content.length - 1 && (
              <input
                style={{
                  width: 1,
                  outline: "none",
                  border: "none",
                  paddingInline: 1,
                  paddingLeft: 8,
                }}
                onKeyDown={(event) => handleDelete(event, index)}
              />
            )}
          </div>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange(setQuery, "right")}
          placeholder="Type here..."
          style={{ outline: "none", border: "none", padding: "4px", flex: "1" }}
          onKeyDown={(event) =>
            !query && handleDelete(event, content.length - 1)
          }
          onBlur={(event) => {
            if (event.relatedTarget) return;
            if (query.trim())
              setContent((prev) => [...prev, { name: query, value: query }]);
            setQuery("");
            setFilteredSuggestions([]);
            setFinalResult(
              evaluate(
                content
                  .concat(query.trim() ? [{ name: query, value: query }] : [])
                  .map((c) => c.value)
                  .join(" ")
              )
            );
          }}
        />
      </div>
      {filteredSuggestions?.length > 0 && (
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: "4px",
            backgroundColor: "white",
            boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
            marginTop: "8px",
          }}
        >
          {filteredSuggestions.map((s, i) => (
            <div
              key={i}
              tabIndex={0}
              onClick={() => handleSelect(s)}
              style={{
                padding: "8px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLDivElement).style.backgroundColor = "#f0f0f0")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLDivElement).style.backgroundColor = "white")
              }
            >
              {s.name}
            </div>
          ))}
        </div>
      )}
      {finalResult && <div style={{ marginTop: 10 }}>Final: {finalResult}</div>}
    </div>
  );
}
