class Rooms::EditPage < MainLayout
  needs operation : SaveRoom
  needs room : Room
  quick_def page_title, "Edit Room with id: #{@room.id}"

  def content
    link "Back to all Rooms", Rooms::Index
    h1 "Edit Room with id: #{@room.id}"
    render_room_form(@operation)
  end

  def render_room_form(op)
    form_for Rooms::Update.with(@room.id) do
      # Edit fields in src/components/rooms/form_fields.cr
      mount Rooms::FormFields.new(op)

      submit "Update", data_disable_with: "Updating..."
    end
  end
end
