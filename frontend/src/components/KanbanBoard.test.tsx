import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";

vi.mock("@/lib/api", () => ({
  getBoard: vi.fn(),
  saveBoard: vi.fn(),
}));

import { getBoard, saveBoard } from "@/lib/api";

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

const defaultProps = {
  username: "user",
  onLogout: vi.fn(),
};

describe("KanbanBoard", () => {
  beforeEach(() => {
    vi.mocked(getBoard).mockResolvedValue(initialData);
    vi.mocked(saveBoard).mockImplementation(async (board) => board);
  });

  it("renders five columns", async () => {
    render(<KanbanBoard {...defaultProps} />);
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
    expect(getBoard).toHaveBeenCalled();
  });

  it("renames a column and saves", async () => {
    render(<KanbanBoard {...defaultProps} />);
    const column = (await screen.findAllByTestId(/column-/i))[0];
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");

    await waitFor(() => {
      expect(saveBoard).toHaveBeenCalled();
    });
  });

  it("adds and removes a card", async () => {
    render(<KanbanBoard {...defaultProps} />);
    const column = (await screen.findAllByTestId(/column-/i))[0];
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();
    await waitFor(() => {
      expect(saveBoard).toHaveBeenCalled();
    });

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });
});
