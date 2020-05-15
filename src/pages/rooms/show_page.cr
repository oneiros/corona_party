class Rooms::ShowPage < RoomLayout
  needs room : Room
  quick_def page_title, "#{@room.name} - corona party"

  def content
    main class: "room container-fluid vh-100", data_controller: "room", data_room_janus_id: @room.janus_id do
      div class: "row peers top justify-content-start h-25", data_target: "room.top" do

      end
      div class: "row main-stage justify-content-center h-50" do
        video id: "main-stage-video"
      end
      div class: "row peers bottom justify-content-end h-25", data_target: "room.bottom" do

      end
    end
  end
end
