import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatSidebar } from "@/components/ChatSidebar";
import { initialData } from "@/lib/kanban";

vi.mock("@/lib/api", () => ({
  sendChatMessage: vi.fn(),
}));

import { sendChatMessage } from "@/lib/api";

const defaultProps = {
  onBoardUpdate: vi.fn(),
};

describe("ChatSidebar", () => {
  beforeEach(() => {
    vi.mocked(sendChatMessage).mockReset();
  });

  it("renders messages and sends on submit", async () => {
    vi.mocked(sendChatMessage).mockResolvedValue({
      message: "Hello from AI",
      board: null,
    });

    render(<ChatSidebar {...defaultProps} />);

    await userEvent.type(screen.getByTestId("chat-input"), "Hi there");
    await userEvent.click(screen.getByTestId("chat-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("chat-message-user")).toHaveTextContent(
        "Hi there"
      );
      expect(screen.getByTestId("chat-message-assistant")).toHaveTextContent(
        "Hello from AI"
      );
    });
    expect(sendChatMessage).toHaveBeenCalledWith("Hi there", []);
  });

  it("triggers board refresh when AI response includes board", async () => {
    const onBoardUpdate = vi.fn();
    vi.mocked(sendChatMessage).mockResolvedValue({
      message: "Added the card.",
      board: initialData,
    });

    render(<ChatSidebar {...defaultProps} onBoardUpdate={onBoardUpdate} />);

    await userEvent.type(screen.getByTestId("chat-input"), "Add a card");
    await userEvent.click(screen.getByTestId("chat-submit"));

    await waitFor(() => {
      expect(onBoardUpdate).toHaveBeenCalledWith(initialData);
    });
  });

  it("shows an error when the chat request fails", async () => {
    vi.mocked(sendChatMessage).mockRejectedValue(new Error("Network error"));

    render(<ChatSidebar {...defaultProps} />);

    await userEvent.type(screen.getByTestId("chat-input"), "Hi");
    await userEvent.click(screen.getByTestId("chat-submit"));

    expect(
      await screen.findByText(/failed to get ai response/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("chat-message-user")).not.toBeInTheDocument();
  });
});
