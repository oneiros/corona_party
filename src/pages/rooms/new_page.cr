class Rooms::NewPage < MainLayout
  needs operation : SaveRoom
  quick_def page_title, "New Room"

  def content
    h1 "New Room"
    render_room_form(@operation)
  end

  def render_room_form(op)
    form_for Rooms::Create do
      # Edit fields in src/components/rooms/form_fields.cr
      mount Rooms::FormFields.new(op)

      submit "Save", class: "btn btn-primary", data_disable_with: "Saving..."
    end
  end
end
