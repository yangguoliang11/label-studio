---
title: Audio Classification
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 307
meta_title: Audio Classification Data Labeling Template
meta_description: Template for classifying audio and intent using Label Studio for your data science and machine learning projects.
---

<img src="/images/templates-misc/audio-classification.png" alt="" class="gif-border" width="482px" height="282px" />

If you want to perform audio classification tasks, such as intent or sentiment classification, you can use this template to listen to an audio file and classify the topic of the clip.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Header value="Listen to the audio:"></Header>
  <Audio name="audio" value="$url"></Audio>
  <Header value="Select its topic:"></Header>
  <Choices name="label" toName="audio" choice="single-radio" showInline="true">
    <Choice value="Politics"></Choice>
    <Choice value="Business"></Choice>
    <Choice value="Education"></Choice>
    <Choice value="Other"></Choice>
  </Choices>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Listen to the audio:"></Header>
```

Use the [Audio](/tags/audio.html) object tag to specify the type and the location of the audio clip. In this case, the audio clip is stored with a `url` key in the data:
```xml
<Audio name="audio" value="$url"></Audio>
```

Use the [Choices](/tags/choices.html) control tag to manage how the classification choices appear to annotators with `showInline="true"` and what selection option is used on the interface with `choice="single-radio"`. The `toName="audio"` option associates the choices with the audio clip. 
```xml
<Choices name="label" toName="audio" choice="single-radio" showInline="true">
```
You must use the Choices tag in combination with the [Choice](/tags/choice.html) to specify the available choices to classify the audio, then close the Choices tag:
```xml
    <Choice value="Politics"></Choice>
    <Choice value="Business"></Choice>
    <Choice value="Education"></Choice>
    <Choice value="Other"></Choice>
</Choices>
```

## Related tags

- [Audio](/tags/audio.html)
- [Choices](/tags/choices.html)

## Related templates

- [意图分类](intent_classification.html)
- [Audio Classification with Segments](audio_regions.html)
