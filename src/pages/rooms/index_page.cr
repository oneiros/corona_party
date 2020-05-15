class Rooms::IndexPage < MainLayout
  needs rooms : RoomQuery
  quick_def page_title, "All Rooms"

  def content
    h1 "All Rooms"
    link "New Room", to: Rooms::New
    render_rooms
  end

  def render_rooms
    ul do
      @rooms.each do |room|
        li do
          link room.name, Rooms::Show.with(room, anchor: room.pin)
        end
      end
    end
  end
end
