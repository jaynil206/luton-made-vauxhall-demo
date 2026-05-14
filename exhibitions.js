// Oral history audio clips, grouped into four thematic sections.
// To add a clip, append an object to the relevant section's clips array:
//   { title: "Clip display name", src: "audio/oral-histories/filename.mp3" }
// Drop the MP3 file into audio/oral-histories/ first.
var ORAL_HISTORIES = [
  {
    id: "present-day",
    title: "Present Day",
    clips: [
      { title: "David K", src: "audio/david-k.mp3"},
      { title: "Dorothy", src: "audio/dorothy.mp3"},
      { title: "John F", src: "audio/john-f.mp3"},
      { title: "Peter B", src: "audio/peter-b.mp3"},
      { title: "Ramesh", src: "audio/ramesh.mp3"},
      { title: "Tony L", src: "audio/tony-l.mp3"},
    ]
  },
  {
    id: "community",
    title: "Community",
    clips: [
      { title: "Andy K", src: "audio/andy-k.mp3"},
      { title: "Brian", src: "audio/brian.mp3"},
      { title: "Carol", src: "audio/carol.mp3"},
      { title: "Janice", src: "audio/janice.mp3"},
      { title: "Nigel", src: "audio/nigel.mp3"},
      { title: "Raymond", src: "audio/raymond.mp3"},
    ]
  },
  {
    id: "journeys",
    title: "Journeys",
    clips: [
      { title: "Janice", src: "audio/janice-journey.mp3"},
      { title: "Paragan", src: "audio/paragan.mp3"},
      { title: "Ram J", src: "audio/ram-j.mp3"},
      { title: "Ram P", src: "audio/ram-p.mp3"},
      { title: "Tony", src: "audio/tony.mp3"},
    ]
  },
  {
    id: "production",
    title: "Production",
    clips: [
      { title: "Abdul P", src: "audio/abdul-p.mp3"},
      { title: "Alan K", src: "audio/alan-k.mp3"},
      { title: "Brian H", src: "audio/brian-h.mp3"},
      { title: "David W", src: "audio/david-w.mp3"},
      { title: "Ram J", src: "audio/ram-j-prod.mp3"},
      { title: "Raymond S", src: "audio/raymond-s.mp3"},
    ]
  }
];
